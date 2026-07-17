// test/throttle.test.js
const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  BIND_MAX_ATTEMPTS,
  BIND_WINDOW_MS,
  isBindThrottled,
  nextFailureState
} = require('../lib/throttle')

const NOW = 1_000_000_000

test('无历史记录时不限流', () => {
  assert.equal(isBindThrottled({}, NOW), false)
  assert.equal(isBindThrottled(null, NOW), false)
  assert.equal(isBindThrottled({ failCount: 0, resetAt: 0 }, NOW), false)
})

test('窗口内未达上限不限流，达到上限后限流', () => {
  const resetAt = NOW + BIND_WINDOW_MS
  assert.equal(
    isBindThrottled({ failCount: BIND_MAX_ATTEMPTS - 1, resetAt }, NOW),
    false
  )
  assert.equal(
    isBindThrottled({ failCount: BIND_MAX_ATTEMPTS, resetAt }, NOW),
    true
  )
})

test('窗口过期后即使次数超限也不再限流', () => {
  const expired = NOW - 1
  assert.equal(
    isBindThrottled({ failCount: BIND_MAX_ATTEMPTS + 3, resetAt: expired }, NOW),
    false
  )
})

test('nextFailureState 首次失败开新窗口', () => {
  assert.deepEqual(nextFailureState({}, NOW), {
    failCount: 1,
    resetAt: NOW + BIND_WINDOW_MS
  })
})

test('nextFailureState 窗口内累加且不重置窗口', () => {
  const resetAt = NOW + 60_000
  assert.deepEqual(nextFailureState({ failCount: 2, resetAt }, NOW), {
    failCount: 3,
    resetAt
  })
})

test('nextFailureState 窗口过期后重新从 1 计数', () => {
  const expired = NOW - 1
  assert.deepEqual(
    nextFailureState({ failCount: 99, resetAt: expired }, NOW),
    { failCount: 1, resetAt: NOW + BIND_WINDOW_MS }
  )
})

test('nextFailureState 不修改传入的状态对象（不可变）', () => {
  const state = { failCount: 2, resetAt: NOW + 60_000 }
  nextFailureState(state, NOW)
  assert.deepEqual(state, { failCount: 2, resetAt: NOW + 60_000 })
})
