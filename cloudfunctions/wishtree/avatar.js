// handlers/avatar.js - 茄子角色、造型与双人互动状态
const cloud = require('wx-server-sdk')
const { ok, fail } = require('./response')
const shared = require('./shared')

const db = cloud.database()

const ROLES = ['king', 'small']
const STYLES = ['normal', 'sunglass', 'hearteye', 'humming', 'sleeping']
const DUOS = ['tietie', 'qinqin']

async function getBoundContext(openid) {
  const user = await shared.findUserByOpenid(openid)
  if (!user) {
    return null
  }
  const couple = await shared.getBoundCoupleForUser(user)
  if (!couple) {
    return null
  }
  const taOpenid =
    couple.creatorOpenid === openid ? couple.partnerOpenid : couple.creatorOpenid
  const ta = taOpenid ? await shared.findUserByOpenid(taOpenid) : null
  return { user, couple, ta }
}

/** 发起双人姿势的一方是哪个角色（老数据无 byRole 时按 openid 推导） */
function duoByRole(ctx) {
  const d = ctx.couple.duo
  if (!d || !d.type) {
    return null
  }
  if (d.byRole) {
    return d.byRole
  }
  if (d.byOpenid === ctx.user.openid) {
    return ctx.user.role || null
  }
  return (ctx.ta && ctx.ta.role) || null
}

function toState(ctx) {
  return {
    myRole: ctx.user.role || null,
    myStyle: ctx.user.style || 'normal',
    taRole: (ctx.ta && ctx.ta.role) || null,
    taStyle: (ctx.ta && ctx.ta.style) || 'normal',
    duo: (ctx.couple.duo && ctx.couple.duo.type) || null,
    duoBy: duoByRole(ctx)
  }
}

/**
 * avatar.state - 双方角色/造型与当前双人姿势
 */
async function state({ openid }) {
  const ctx = await getBoundContext(openid)
  if (!ctx) {
    return fail('还没有绑定另一半哦')
  }
  return ok(toState(ctx))
}

/**
 * avatar.choose - 选定自己的角色（对方已占的不能选）
 */
async function choose({ openid, data }) {
  if (!ROLES.includes(data.role)) {
    return fail('参数错误')
  }
  const ctx = await getBoundContext(openid)
  if (!ctx) {
    return fail('还没有绑定另一半哦')
  }
  if (ctx.user.role) {
    return ok(toState(ctx)) // 已选过，幂等返回
  }
  if (ctx.ta && ctx.ta.role === data.role) {
    return fail('这个角色已经被 TA 选啦')
  }
  await db
    .collection('users')
    .where({ openid })
    .update({ data: { role: data.role, style: 'normal' } })
  ctx.user.role = data.role
  ctx.user.style = 'normal'
  return ok(toState(ctx))
}

/**
 * avatar.style - 修改自己的造型；任何单方造型变化都会解除双人姿势
 */
async function style({ openid, data }) {
  if (!STYLES.includes(data.style)) {
    return fail('参数错误')
  }
  const ctx = await getBoundContext(openid)
  if (!ctx) {
    return fail('还没有绑定另一半哦')
  }
  if (!ctx.user.role) {
    return fail('先选好自己的角色哦')
  }
  await db.collection('users').where({ openid }).update({ data: { style: data.style } })
  await db
    .collection('couples')
    .where({ _id: ctx.couple._id })
    .update({ data: { duo: null } })
  ctx.user.style = data.style
  ctx.couple.duo = null
  return ok(toState(ctx))
}

/**
 * avatar.duo - 对 TA 发起双人互动（贴贴/亲亲），形成合体姿势
 */
async function duo({ openid, data }) {
  if (!DUOS.includes(data.type)) {
    return fail('参数错误')
  }
  const ctx = await getBoundContext(openid)
  if (!ctx) {
    return fail('还没有绑定另一半哦')
  }
  if (!ctx.user.role) {
    return fail('先选好自己的角色哦')
  }
  // 注意 1：serverDate 不能嵌套在对象内，这里用普通时间戳
  // 注意 2：update 对嵌套对象是"合并子字段"语义，duo 之前被写成 null 时合并会报错，
  //         必须用 _.set() 整体替换
  const _ = db.command
  await db
    .collection('couples')
    .where({ _id: ctx.couple._id })
    .update({
      data: {
        duo: _.set({
          type: data.type,
          byOpenid: openid,
          byRole: ctx.user.role,
          at: Date.now()
        })
      }
    })
  ctx.couple.duo = { type: data.type, byOpenid: openid, byRole: ctx.user.role }
  return ok(toState(ctx))
}

module.exports = { state, choose, style, duo }
