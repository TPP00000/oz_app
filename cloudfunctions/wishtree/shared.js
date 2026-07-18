// handlers/shared.js - 各 handler 共用的数据访问逻辑
// 统一用 where 查询代替 doc().get()：查不到返回空数组而不是抛错，
// 这样"不存在"和"数据库故障"不会被混为一谈，故障会向上抛给入口统一处理
const cloud = require('wx-server-sdk')

const db = cloud.database()

/** 按 openid 查用户，不存在返回 null */
async function findUserByOpenid(openid) {
  const res = await db.collection('users').where({ openid }).limit(1).get()
  return res.data[0] || null
}

/** 按 id 查情侣关系，不存在返回 null */
async function findCoupleById(coupleId) {
  if (!coupleId) {
    return null
  }
  const res = await db
    .collection('couples')
    .where({ _id: coupleId })
    .limit(1)
    .get()
  return res.data[0] || null
}

/** 用户 coupleId 指向的、状态为已绑定的情侣关系；否则 null */
async function getBoundCoupleForUser(user) {
  const couple = await findCoupleById(user && user.coupleId)
  return couple && couple.status === 'bound' ? couple : null
}

/**
 * 按成员 openid 查已绑定的情侣关系（不依赖用户文档上的 coupleId）。
 * 用于兜底自愈：绑定流程中途失败时，关系可能已建立但 coupleId 没写上
 */
async function findBoundCoupleByMember(openid) {
  const _ = db.command
  const res = await db
    .collection('couples')
    .where(
      _.or([
        { creatorOpenid: openid, status: 'bound' },
        { partnerOpenid: openid, status: 'bound' }
      ])
    )
    .limit(1)
    .get()
  return res.data[0] || null
}

/** 查属于指定情侣的卡片（归属校验合并进查询条件） */
async function findCardForCouple(cardId, coupleId) {
  const res = await db
    .collection('cards')
    .where({ _id: cardId, coupleId })
    .limit(1)
    .get()
  return res.data[0] || null
}

module.exports = {
  findUserByOpenid,
  findCoupleById,
  getBoundCoupleForUser,
  findBoundCoupleByMember,
  findCardForCouple
}
