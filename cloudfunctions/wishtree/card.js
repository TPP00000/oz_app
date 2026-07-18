// handlers/card.js - 问答卡片（愿望果）
const cloud = require('wx-server-sdk')
const { ok, fail } = require('./response')
const { validateQuestion, validateAnswer } = require('./validate')
const shared = require('./shared')

const db = cloud.database()

// MVP 已知限制：超过 100 条后旧卡片不再返回（两人日常使用量远达不到，
// 后续如需要再加分页）
const LIST_LIMIT = 100

// 果子品种：种问题时随机决定，两人看到同一种
const SPECIES = ['eggplant', 'apple']

/** 当前用户已绑定的 coupleId，未绑定返回 null */
async function getBoundCoupleId(openid) {
  const user = await shared.findUserByOpenid(openid)
  if (!user) {
    return null
  }
  const couple = await shared.getBoundCoupleForUser(user)
  return couple ? couple._id : null
}

/** 卡片的客户端安全视图（不暴露 openid） */
function toClientCard(card, openid) {
  return {
    id: card._id,
    question: card.question,
    answer: card.answer,
    status: card.status,
    species: card.species || 'apple',
    askedByMe: card.askerOpenid === openid,
    createdAt: card.createdAt,
    answeredAt: card.answeredAt
  }
}

/**
 * card.list - 当前情侣的卡片（按创建时间倒序）
 */
async function list({ openid }) {
  const coupleId = await getBoundCoupleId(openid)
  if (!coupleId) {
    return fail('还没有绑定另一半哦')
  }
  const res = await db
    .collection('cards')
    .where({ coupleId })
    .orderBy('createdAt', 'desc')
    .limit(LIST_LIMIT)
    .get()
  return ok(res.data.map((card) => toClientCard(card, openid)))
}

/**
 * card.create - 种一个问题
 */
async function create({ openid, data }) {
  const check = validateQuestion(data.question)
  if (!check.valid) {
    return fail(check.error)
  }
  const coupleId = await getBoundCoupleId(openid)
  if (!coupleId) {
    return fail('还没有绑定另一半哦')
  }
  const addRes = await db.collection('cards').add({
    data: {
      coupleId,
      question: check.value,
      askerOpenid: openid,
      answer: null,
      answererOpenid: null,
      status: 'pending',
      species: SPECIES[Math.floor(Math.random() * SPECIES.length)],
      createdAt: db.serverDate(),
      answeredAt: null
    }
  })
  return ok({ id: addRes._id })
}

/** 校验参数并取出属于当前用户情侣的卡片；失败时返回 fail 响应 */
async function loadOwnedCard(openid, cardId) {
  if (!cardId || typeof cardId !== 'string') {
    return { error: fail('参数错误') }
  }
  const coupleId = await getBoundCoupleId(openid)
  if (!coupleId) {
    return { error: fail('还没有绑定另一半哦') }
  }
  const card = await shared.findCardForCouple(cardId, coupleId)
  if (!card) {
    return { error: fail('这颗果子不见了') }
  }
  return { card }
}

/**
 * card.get - 单张卡片详情（校验归属）
 */
async function get({ openid, data }) {
  const { card, error } = await loadOwnedCard(openid, data.cardId)
  if (error) {
    return error
  }
  return ok(toClientCard(card, openid))
}

/**
 * card.answer - 回答对方的问题
 */
async function answer({ openid, data }) {
  const check = validateAnswer(data.answer)
  if (!check.valid) {
    return fail(check.error)
  }
  const { card, error } = await loadOwnedCard(openid, data.cardId)
  if (error) {
    return error
  }
  if (card.askerOpenid === openid) {
    return fail('自己的问题要等 TA 来回答哦')
  }
  if (card.status !== 'pending') {
    return fail('这颗果子已经成熟啦')
  }

  // 条件更新防止重复作答
  const updateRes = await db
    .collection('cards')
    .where({ _id: card._id, status: 'pending' })
    .update({
      data: {
        answer: check.value,
        answererOpenid: openid,
        status: 'answered',
        answeredAt: db.serverDate()
      }
    })
  if (updateRes.stats.updated !== 1) {
    return fail('这颗果子已经成熟啦')
  }
  return ok({ id: card._id })
}

module.exports = { list, create, get, answer }
