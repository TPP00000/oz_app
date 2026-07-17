// handlers/user.js - 用户初始化
const cloud = require('wx-server-sdk')
const { ok } = require('../lib/response')
const shared = require('./shared')

const db = cloud.database()

const COLLECTIONS = ['users', 'couples', 'cards']

// 同一云函数实例只需建一次表（冷启动后首次调用执行）
let collectionsReady = false

/** 确保集合存在（已存在时静默忽略，其他异常记录日志但不阻断） */
async function ensureCollections() {
  if (collectionsReady) {
    return
  }
  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name)
    } catch (err) {
      const msg = String((err && err.errMsg) || err)
      if (!msg.includes('exist')) {
        console.warn(`[wishtree] createCollection ${name} failed:`, msg)
      }
    }
  }
  collectionsReady = true
}

/** 情侣关系的客户端安全视图 */
function toClientCouple(couple) {
  return couple ? { id: couple._id, boundAt: couple.boundAt } : null
}

/**
 * user.init - 获取或创建用户，返回 openid 与情侣状态。
 * 若关系已建立但用户文档上 coupleId 缺失（绑定中途失败），在此自愈补写
 */
async function init({ openid }) {
  await ensureCollections()

  let user = await shared.findUserByOpenid(openid)
  if (!user) {
    const addRes = await db.collection('users').add({
      data: { openid, coupleId: null, createdAt: db.serverDate() }
    })
    user = { _id: addRes._id, openid, coupleId: null }
  }

  let couple = await shared.getBoundCoupleForUser(user)
  if (!couple) {
    couple = await shared.findBoundCoupleByMember(openid)
    if (couple) {
      await db
        .collection('users')
        .where({ openid })
        .update({ data: { coupleId: couple._id } })
    }
  }

  return ok({ openid, couple: toClientCouple(couple) })
}

module.exports = { init }
