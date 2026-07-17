// lib/validate.js - 输入校验（系统边界，所有外部输入都要过这里）

const QUESTION_MAX = 200
const ANSWER_MAX = 500

/**
 * 校验文本输入
 * @param {unknown} input
 * @param {number} maxLength
 * @param {string} label 用于错误提示的名称
 * @returns {{ valid: boolean, value: string, error: string | null }}
 */
function validateText(input, maxLength, label) {
  if (typeof input !== 'string') {
    return { valid: false, value: '', error: `${label}格式不正确` }
  }
  const value = input.trim()
  if (!value) {
    return { valid: false, value: '', error: `${label}不能为空` }
  }
  if (value.length > maxLength) {
    return { valid: false, value: '', error: `${label}最多 ${maxLength} 字` }
  }
  return { valid: true, value, error: null }
}

/** 校验问题文本 */
function validateQuestion(input) {
  return validateText(input, QUESTION_MAX, '问题')
}

/** 校验回答文本 */
function validateAnswer(input) {
  return validateText(input, ANSWER_MAX, '回答')
}

module.exports = { QUESTION_MAX, ANSWER_MAX, validateQuestion, validateAnswer }
