// utils/api.js - 云函数调用封装
// 所有后端请求都走 wishtree 云函数，返回统一格式 { success, data, error }

/**
 * 调用云函数并解包统一响应格式
 * @param {string} action 操作名，如 'user.init'
 * @param {object} [data] 参数
 * @returns {Promise<any>} 成功时返回 data 载荷，失败时抛出带 message 的错误
 */
function call(action, data) {
  return wx.cloud
    .callFunction({
      name: 'wishtree',
      data: { action, data: data || {} }
    })
    .then((res) => {
      const result = res && res.result
      if (!result || typeof result.success !== 'boolean') {
        throw new Error('服务返回异常，请稍后再试')
      }
      if (!result.success) {
        throw new Error(result.error || '操作失败，请稍后再试')
      }
      return result.data
    })
    .catch((err) => {
      const raw = (err && (err.message || err.errMsg)) || ''
      // callFunction 的失败信息形如 "cloud.callFunction:fail ..."，不适合直接给用户看
      if (raw.indexOf('cloud.callFunction:fail') !== -1) {
        throw new Error('网络开小差了，请检查网络后重试')
      }
      throw err instanceof Error ? err : new Error('出错了，请稍后再试')
    })
}

module.exports = { call }
