// test/response.test.js
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { ok, fail } = require('../../cloudfunctions/wishtree/response')

test('ok 返回统一成功格式', () => {
  assert.deepEqual(ok({ a: 1 }), { success: true, data: { a: 1 }, error: null })
})

test('ok 无参数时 data 为 null', () => {
  assert.deepEqual(ok(), { success: true, data: null, error: null })
})

test('fail 返回统一失败格式', () => {
  assert.deepEqual(fail('出错了'), {
    success: false,
    data: null,
    error: '出错了'
  })
})

test('fail 无文案时提供兜底提示', () => {
  const result = fail()
  assert.equal(result.success, false)
  assert.ok(result.error.length > 0)
})
