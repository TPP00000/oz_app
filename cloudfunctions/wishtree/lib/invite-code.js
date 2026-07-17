// lib/invite-code.js - 邀请码生成与校验
// 字符集去掉了容易混淆的 0/O/1/I/L
// 邀请码是绑定关系的唯一凭证，默认使用加密安全随机源生成

const crypto = require('crypto')

const CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

/**
 * 生成邀请码
 * @param {() => number} [rand] 可选的 [0,1) 随机函数，仅供测试注入；
 *   不传时使用 crypto.randomInt（加密安全）
 * @returns {string}
 */
function generateInviteCode(rand) {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    const index = rand
      ? Math.min(Math.floor(rand() * CODE_CHARSET.length), CODE_CHARSET.length - 1)
      : crypto.randomInt(CODE_CHARSET.length)
    code += CODE_CHARSET[index]
  }
  return code
}

/**
 * 归一化用户输入的邀请码（去空格、转大写）
 * @param {unknown} input
 * @returns {string}
 */
function normalizeInviteCode(input) {
  if (typeof input !== 'string') {
    return ''
  }
  return input.trim().toUpperCase()
}

/**
 * 校验邀请码格式
 * @param {string} code 已归一化的邀请码
 * @returns {boolean}
 */
function isValidInviteCode(code) {
  if (typeof code !== 'string' || code.length !== CODE_LENGTH) {
    return false
  }
  return [...code].every((ch) => CODE_CHARSET.includes(ch))
}

module.exports = {
  CODE_CHARSET,
  CODE_LENGTH,
  generateInviteCode,
  normalizeInviteCode,
  isValidInviteCode
}
