// lib/throttle.js - 绑定尝试限流（防止暴力猜邀请码）
// 纯函数，状态由调用方持久化到用户文档

const BIND_MAX_ATTEMPTS = 5
const BIND_WINDOW_MS = 10 * 60 * 1000

/**
 * 当前是否应拒绝本次尝试
 * @param {{ failCount?: number, resetAt?: number }} state 已有的失败记录（resetAt 为毫秒时间戳）
 * @param {number} now 当前毫秒时间戳
 * @returns {boolean}
 */
function isBindThrottled(state, now) {
  const { failCount = 0, resetAt = 0 } = state || {}
  if (!resetAt || now > resetAt) {
    return false
  }
  return failCount >= BIND_MAX_ATTEMPTS
}

/**
 * 一次失败后的新状态（窗口过期则重新开窗计数）
 * @param {{ failCount?: number, resetAt?: number }} state
 * @param {number} now
 * @returns {{ failCount: number, resetAt: number }}
 */
function nextFailureState(state, now) {
  const { failCount = 0, resetAt = 0 } = state || {}
  if (!resetAt || now > resetAt) {
    return { failCount: 1, resetAt: now + BIND_WINDOW_MS }
  }
  return { failCount: failCount + 1, resetAt }
}

module.exports = {
  BIND_MAX_ATTEMPTS,
  BIND_WINDOW_MS,
  isBindThrottled,
  nextFailureState
}
