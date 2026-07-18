// handlers/photo.js - 照片墙（情侣日常照片）
const cloud = require('wx-server-sdk')
const { ok, fail } = require('../lib/response')
const { validateCaption } = require('../lib/validate')
const shared = require('./shared')

const db = cloud.database()

const LIST_LIMIT = 100

/** 当前用户已绑定的 coupleId，未绑定返回 null */
async function getBoundCoupleId(openid) {
  const user = await shared.findUserByOpenid(openid)
  if (!user) {
    return null
  }
  const couple = await shared.getBoundCoupleForUser(user)
  return couple ? couple._id : null
}

function toClientPhoto(photo, openid) {
  return {
    id: photo._id,
    fileId: photo.fileId,
    caption: photo.caption || '',
    mine: photo.uploaderOpenid === openid,
    createdAt: photo.createdAt
  }
}

/**
 * photo.list - 当前情侣的照片（按时间倒序，最多 100 张）
 */
async function list({ openid }) {
  const coupleId = await getBoundCoupleId(openid)
  if (!coupleId) {
    return fail('还没有绑定另一半哦')
  }
  const res = await db
    .collection('photos')
    .where({ coupleId })
    .orderBy('createdAt', 'desc')
    .limit(LIST_LIMIT)
    .get()
  return ok(res.data.map((p) => toClientPhoto(p, openid)))
}

/**
 * photo.create - 记录一张已上传到云存储的照片
 */
async function create({ openid, data }) {
  if (!data.fileId || typeof data.fileId !== 'string') {
    return fail('参数错误')
  }
  const check = validateCaption(data.caption)
  if (!check.valid) {
    return fail(check.error)
  }
  const coupleId = await getBoundCoupleId(openid)
  if (!coupleId) {
    return fail('还没有绑定另一半哦')
  }
  const addRes = await db.collection('photos').add({
    data: {
      coupleId,
      fileId: data.fileId,
      caption: check.value,
      uploaderOpenid: openid,
      createdAt: db.serverDate()
    }
  })
  return ok({ id: addRes._id })
}

/**
 * photo.remove - 删除自己贴的照片（记录 + 云存储文件）
 */
async function remove({ openid, data }) {
  if (!data.photoId || typeof data.photoId !== 'string') {
    return fail('参数错误')
  }
  const coupleId = await getBoundCoupleId(openid)
  if (!coupleId) {
    return fail('还没有绑定另一半哦')
  }
  const res = await db
    .collection('photos')
    .where({ _id: data.photoId, coupleId })
    .limit(1)
    .get()
  const photo = res.data[0]
  if (!photo) {
    return fail('这张照片不见了')
  }
  if (photo.uploaderOpenid !== openid) {
    return fail('只能撕掉自己贴的照片哦')
  }
  await db.collection('photos').where({ _id: data.photoId }).remove()
  try {
    await cloud.deleteFile({ fileList: [photo.fileId] })
  } catch (err) {
    // 存储文件删除失败不影响主流程（记录已删，孤儿文件可后续清理）
    console.warn('[wishtree] deleteFile failed:', photo.fileId)
  }
  return ok({ id: data.photoId })
}

module.exports = { list, create, remove }
