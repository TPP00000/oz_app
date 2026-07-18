// test/validate.test.js
const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  QUESTION_MAX,
  ANSWER_MAX,
  CAPTION_MAX,
  validateQuestion,
  validateAnswer,
  validateCaption
} = require('../../cloudfunctions/wishtree/validate')

test('validateQuestion 接受正常问题并去除首尾空格', () => {
  const result = validateQuestion('  你最喜欢的电影是什么？  ')
  assert.equal(result.valid, true)
  assert.equal(result.value, '你最喜欢的电影是什么？')
  assert.equal(result.error, null)
})

test('validateQuestion 拒绝空输入与纯空格', () => {
  assert.equal(validateQuestion('').valid, false)
  assert.equal(validateQuestion('   ').valid, false)
})

test('validateQuestion 拒绝非字符串', () => {
  assert.equal(validateQuestion(null).valid, false)
  assert.equal(validateQuestion(undefined).valid, false)
  assert.equal(validateQuestion(42).valid, false)
  assert.equal(validateQuestion(['问题']).valid, false)
})

test('validateQuestion 边界长度：刚好上限通过，超一字拒绝', () => {
  assert.equal(validateQuestion('问'.repeat(QUESTION_MAX)).valid, true)
  assert.equal(validateQuestion('问'.repeat(QUESTION_MAX + 1)).valid, false)
})

test('validateAnswer 边界长度：刚好上限通过，超一字拒绝', () => {
  assert.equal(validateAnswer('答'.repeat(ANSWER_MAX)).valid, true)
  assert.equal(validateAnswer('答'.repeat(ANSWER_MAX + 1)).valid, false)
})

test('validateCaption 允许为空、去空格、限制长度', () => {
  assert.deepEqual(validateCaption(''), { valid: true, value: '', error: null })
  assert.deepEqual(validateCaption(undefined), { valid: true, value: '', error: null })
  assert.equal(validateCaption('  今天的晚饭  ').value, '今天的晚饭')
  assert.equal(validateCaption('说'.repeat(CAPTION_MAX)).valid, true)
  assert.equal(validateCaption('说'.repeat(CAPTION_MAX + 1)).valid, false)
  assert.equal(validateCaption(123).valid, false)
})

test('校验失败时 error 是用户可读文案', () => {
  assert.match(validateQuestion('').error, /不能为空/)
  assert.match(validateQuestion('问'.repeat(QUESTION_MAX + 1)).error, /最多/)
  assert.match(validateAnswer(123).error, /格式不正确/)
})
