// test/invite-code.test.js
const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  CODE_CHARSET,
  CODE_LENGTH,
  generateInviteCode,
  normalizeInviteCode,
  isValidInviteCode
} = require('../lib/invite-code')

test('generateInviteCode 生成 6 位、只含合法字符的邀请码', () => {
  for (let i = 0; i < 100; i += 1) {
    const code = generateInviteCode()
    assert.equal(code.length, CODE_LENGTH)
    assert.ok([...code].every((ch) => CODE_CHARSET.includes(ch)))
  }
})

test('generateInviteCode 使用注入的随机函数（可测试性）', () => {
  const alwaysZero = () => 0
  assert.equal(generateInviteCode(alwaysZero), 'AAAAAA')
  const almostOne = () => 0.999999
  const lastChar = CODE_CHARSET[CODE_CHARSET.length - 1]
  assert.equal(generateInviteCode(almostOne), lastChar.repeat(CODE_LENGTH))
})

test('字符集不含易混淆字符 0 O 1 I L', () => {
  for (const ch of ['0', 'O', '1', 'I', 'L']) {
    assert.ok(!CODE_CHARSET.includes(ch), `charset should not include ${ch}`)
  }
})

test('normalizeInviteCode 去空格并转大写', () => {
  assert.equal(normalizeInviteCode('  ab23cd '), 'AB23CD')
  assert.equal(normalizeInviteCode('xyz789'), 'XYZ789')
})

test('normalizeInviteCode 非字符串输入返回空串', () => {
  assert.equal(normalizeInviteCode(null), '')
  assert.equal(normalizeInviteCode(undefined), '')
  assert.equal(normalizeInviteCode(123456), '')
  assert.equal(normalizeInviteCode({}), '')
})

test('isValidInviteCode 校验长度与字符集', () => {
  assert.equal(isValidInviteCode('AB23CD'), true)
  assert.equal(isValidInviteCode('AB23C'), false) // 太短
  assert.equal(isValidInviteCode('AB23CDE'), false) // 太长
  assert.equal(isValidInviteCode('AB23C0'), false) // 含 0
  assert.equal(isValidInviteCode('ab23cd'), false) // 未归一化的小写
  assert.equal(isValidInviteCode(''), false)
})
