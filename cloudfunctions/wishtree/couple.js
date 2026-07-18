// handlers/couple.js - 情侣邀请与绑定
const cloud = require('wx-server-sdk')
const { ok, fail } = require('./response')
const {
  generateInviteCode,
  normalizeInviteCode,
  isValidInviteCode
} = require('./invite-code')
const { isBindThrottled, nextFailureState } = require('./throttle')
const shared = require('./shared')

const db = cloud.database()

const MAX_CODE_RETRY = 5

/** 生成一个当前未被占用的邀请码 */
async function generateUniqueCode() {
  for (let i = 0; i < MAX_CODE_RETRY; i += 1) {
    const code = generateInviteCode()
    const dup = await db
      .collection('couples')
      .where({ inviteCode: code, status: 'pending' })
      .count()
    if (dup.total === 0) {
      return code
    }
  }
  throw new Error('generate invite code failed')
}

/**
 * couple.createInvite - 生成邀请码（重复调用返回同一个待绑定邀请码）
 */
async function createInvite({ openid }) {
  const user = await shared.findUserByOpenid(openid)
  if (!user) {
    return fail('请先重新打开小程序')
  }
  if (await shared.findBoundCoupleByMember(openid)) {
    return fail('你已经绑定过另一半啦')
  }

  const existing = await db
    .collection('couples')
    .where({ creatorOpenid: openid, status: 'pending' })
    .limit(1)
    .get()
  if (existing.data[0]) {
    return ok({ inviteCode: existing.data[0].inviteCode })
  }

  const inviteCode = await generateUniqueCode()
  await db.collection('couples').add({
    data: {
      inviteCode,
      creatorOpenid: openid,
      partnerOpenid: null,
      status: 'pending',
      createdAt: db.serverDate(),
      boundAt: null
    }
  })
  return ok({ inviteCode })
}

/** 读取限流状态（resetAt 统一转毫秒时间戳） */
function throttleStateOf(user) {
  return {
    failCount: user.bindFailCount || 0,
    resetAt: user.bindFailResetAt ? new Date(user.bindFailResetAt).getTime() : 0
  }
}

/** 记录一次绑定失败尝试 */
async function recordBindFailure(user, now) {
  const next = nextFailureState(throttleStateOf(user), now)
  await db
    .collection('users')
    .where({ openid: user.openid })
    .update({
      data: {
        bindFailCount: next.failCount,
        bindFailResetAt: new Date(next.resetAt)
      }
    })
}

/** 作废某一方名下所有待绑定邀请，防止旧邀请码日后被第三人使用 */
async function cancelPendingInvites(openids) {
  const _ = db.command
  await db
    .collection('couples')
    .where({ creatorOpenid: _.in(openids), status: 'pending' })
    .update({ data: { status: 'cancelled' } })
}

/** 执行绑定写入；返回绑定后的关系，抢绑失败返回 null */
async function performBind(couple, openid) {
  // 条件更新防止并发抢绑：只有仍处于 pending 时才会更新成功
  const updateRes = await db
    .collection('couples')
    .where({ _id: couple._id, status: 'pending' })
    .update({
      data: {
        partnerOpenid: openid,
        status: 'bound',
        boundAt: db.serverDate()
      }
    })
  if (updateRes.stats.updated !== 1) {
    return null
  }

  // 以下任一步失败，user.init 的自愈逻辑会在下次启动时补写 coupleId
  await db
    .collection('users')
    .where({ openid: couple.creatorOpenid })
    .update({ data: { coupleId: couple._id } })
  await db
    .collection('users')
    .where({ openid })
    .update({ data: { coupleId: couple._id } })
  await cancelPendingInvites([couple.creatorOpenid, openid])

  return shared.findCoupleById(couple._id)
}

/**
 * couple.bindWithCode - 用邀请码绑定
 */
async function bindWithCode({ openid, data }) {
  const code = normalizeInviteCode(data.inviteCode)
  if (!isValidInviteCode(code)) {
    return fail('邀请码格式不对，应为 6 位字母数字')
  }

  const user = await shared.findUserByOpenid(openid)
  if (!user) {
    return fail('请先重新打开小程序')
  }
  const now = Date.now()
  if (isBindThrottled(throttleStateOf(user), now)) {
    return fail('尝试次数太多啦，休息 10 分钟再试吧')
  }
  if (await shared.findBoundCoupleByMember(openid)) {
    return fail('你已经绑定过另一半啦')
  }

  const found = await db
    .collection('couples')
    .where({ inviteCode: code, status: 'pending' })
    .limit(1)
    .get()
  const couple = found.data[0]
  if (!couple) {
    await recordBindFailure(user, now)
    return fail('邀请码不存在或已被使用')
  }
  if (couple.creatorOpenid === openid) {
    return fail('这是你自己的邀请码，要发给 TA 才行哦')
  }
  // 创建者若已另有绑定关系，这个旧邀请码立即作废，防止顶掉 TA 现有的关系
  if (await shared.findBoundCoupleByMember(couple.creatorOpenid)) {
    await cancelPendingInvites([couple.creatorOpenid])
    await recordBindFailure(user, now)
    return fail('邀请码已失效')
  }

  const bound = await performBind(couple, openid)
  if (!bound) {
    return fail('手慢了，这个邀请码刚被使用')
  }
  return ok({ couple: { id: bound._id, boundAt: bound.boundAt } })
}

/**
 * couple.unbind - 解除调用者当前的绑定关系（无界面入口，供开发调试/特殊场景手动调用）
 * 关系标记为 dissolved 而非删除，旧卡片数据保留但不再可见
 */
async function unbind({ openid }) {
  const user = await shared.findUserByOpenid(openid)
  if (!user) {
    return fail('请先重新打开小程序')
  }
  const couple = await shared.findBoundCoupleByMember(openid)
  if (!couple) {
    return ok({ unbound: false })
  }

  await db
    .collection('couples')
    .where({ _id: couple._id })
    .update({ data: { status: 'dissolved', dissolvedAt: db.serverDate() } })

  const members = [couple.creatorOpenid, couple.partnerOpenid].filter(Boolean)
  const _ = db.command
  await db
    .collection('users')
    .where({ openid: _.in(members) })
    .update({ data: { coupleId: null } })

  return ok({ unbound: true })
}

module.exports = { createInvite, bindWithCode, unbind }
