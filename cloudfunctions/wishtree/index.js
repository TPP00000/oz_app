// index.js - wishtree 云函数入口（按 action 路由到各 handler）
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const userHandlers = require('./user')
const coupleHandlers = require('./couple')
const cardHandlers = require('./card')
const photoHandlers = require('./photo')
const noteHandlers = require('./note')
const avatarHandlers = require('./avatar')
const { fail } = require('./response')

const ROUTES = {
  'user.init': userHandlers.init,
  'couple.createInvite': coupleHandlers.createInvite,
  'couple.bindWithCode': coupleHandlers.bindWithCode,
  'couple.unbind': coupleHandlers.unbind,
  'card.list': cardHandlers.list,
  'card.create': cardHandlers.create,
  'card.get': cardHandlers.get,
  'card.answer': cardHandlers.answer,
  'photo.list': photoHandlers.list,
  'photo.create': photoHandlers.create,
  'photo.remove': photoHandlers.remove,
  'note.list': noteHandlers.list,
  'note.create': noteHandlers.create,
  'note.update': noteHandlers.update,
  'note.remove': noteHandlers.remove,
  'avatar.state': avatarHandlers.state,
  'avatar.choose': avatarHandlers.choose,
  'avatar.style': avatarHandlers.style,
  'avatar.duo': avatarHandlers.duo
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return fail('登录状态异常，请重新打开小程序')
  }

  const handler = ROUTES[event && event.action]
  if (!handler) {
    return fail('未知操作')
  }

  try {
    return await handler({ openid: OPENID, data: (event && event.data) || {} })
  } catch (err) {
    // 云函数的标准日志通道就是 console，日志可在云开发控制台查看
    console.error(`[wishtree] action=${event.action} failed:`, err)
    return fail('服务开小差了，请稍后再试')
  }
}
