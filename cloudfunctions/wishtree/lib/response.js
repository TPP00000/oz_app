// lib/response.js - 统一响应格式 { success, data, error }

/**
 * 成功响应
 * @param {any} data
 */
function ok(data) {
  return { success: true, data: data === undefined ? null : data, error: null }
}

/**
 * 失败响应（error 为可直接展示给用户的文案）
 * @param {string} error
 */
function fail(error) {
  return { success: false, data: null, error: error || '操作失败，请稍后再试' }
}

module.exports = { ok, fail }
