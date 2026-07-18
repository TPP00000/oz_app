// handlers/note.js - 手写留言板（笔迹图片）
const cloud = require('wx-server-sdk')
const { ok, fail } = require('./response')
const shared = require('./shared')

const db = cloud.database()

const LIST_LIMIT = 100

async function getBoundCoupleId(openid) {
  const user = await shared.findUserByOpenid(openid)
  if (!user) {
    return null
  }
  const couple = await shared.getBoundCoupleForUser(user)
  return couple ? couple._id : null
}

function toClientNote(note, openid) {
  return {
    id: note._id,
    fileId: note.fileId,
    mine: note.authorOpenid === openid,
    createdAt: note.createdAt
  }
}

/**
 * note.list - 当前情侣的留言（按时间倒序，最多 100 张）
 */
async function list({ openid }) {
  const coupleId = await getBoundCoupleId(openid)
  if (!coupleId) {
    return fail('还没有绑定另一半哦')
  }
  const res = await db
    .collection('notes')
    .where({ coupleId })
    .orderBy('createdAt', 'desc')
    .limit(LIST_LIMIT)
    .get()
  return ok(res.data.map((n) => toClientNote(n, openid)))
}

/**
 * note.create - 记录一张已上传的手写留言
 */
async function create({ openid, data }) {
  if (!data.fileId || typeof data.fileId !== 'string') {
    return fail('参数错误')
  }
  const coupleId = await getBoundCoupleId(openid)
  if (!coupleId) {
    return fail('还没有绑定另一半哦')
  }
  const addRes = await db.collection('notes').add({
    data: {
      coupleId,
      fileId: data.fileId,
      authorOpenid: openid,
      createdAt: db.serverDate()
    }
  })
  return ok({ id: addRes._id })
}

/**
 * note.update - 覆盖自己写的留言（换新笔迹图，旧文件清理）
 */
async function update({ openid, data }) {
  if (!data.noteId || typeof data.noteId !== 'string' || !data.fileId || typeof data.fileId !== 'string') {
    return fail('参数错误')
  }
  const coupleId = await getBoundCoupleId(openid)
  if (!coupleId) {
    return fail('还没有绑定另一半哦')
  }
  const res = await db
    .collection('notes')
    .where({ _id: data.noteId, coupleId })
    .limit(1)
    .get()
  const note = res.data[0]
  if (!note) {
    return fail('这张纸条不见了')
  }
  if (note.authorOpenid !== openid) {
    return fail('只能修改自己写的纸条哦')
  }
  const oldFileId = note.fileId
  await db
    .collection('notes')
    .where({ _id: data.noteId })
    .update({ data: { fileId: data.fileId, editedAt: db.serverDate() } })
  if (oldFileId && oldFileId !== data.fileId) {
    try {
      await cloud.deleteFile({ fileList: [oldFileId] })
    } catch (err) {
      console.warn('[wishtree] deleteFile failed:', oldFileId)
    }
  }
  return ok({ id: data.noteId })
}

/**
 * note.remove - 揭下自己写的留言（记录 + 云存储文件）
 */
async function remove({ openid, data }) {
  if (!data.noteId || typeof data.noteId !== 'string') {
    return fail('参数错误')
  }
  const coupleId = await getBoundCoupleId(openid)
  if (!coupleId) {
    return fail('还没有绑定另一半哦')
  }
  const res = await db
    .collection('notes')
    .where({ _id: data.noteId, coupleId })
    .limit(1)
    .get()
  const note = res.data[0]
  if (!note) {
    return fail('这张纸条不见了')
  }
  if (note.authorOpenid !== openid) {
    return fail('只能揭下自己写的纸条哦')
  }
  await db.collection('notes').where({ _id: data.noteId }).remove()
  try {
    await cloud.deleteFile({ fileList: [note.fileId] })
  } catch (err) {
    console.warn('[wishtree] deleteFile failed:', note.fileId)
  }
  return ok({ id: data.noteId })
}

module.exports = { list, create, update, remove }
