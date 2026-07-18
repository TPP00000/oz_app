// scripts/test-timezone.js - 时区工具回归测试（本地脚本，不属于小程序运行时）
// 用法: node scripts/test-timezone.js
// 手写偏移回退路径 与 Node 完整 ICU 的 Intl 路径逐时刻对拍：
// 全年每 6 小时采样 + 每个夏令时切换点前后 ±4 小时按 15 分钟步进密集采样
const path = require('node:path')

const MOD = path.join(__dirname, '..', 'miniprogram', 'utils', 'timezone.js')

function loadFresh(breakIntl) {
  delete require.cache[require.resolve(MOD)]
  const RealDTF = Intl.DateTimeFormat
  if (breakIntl) {
    Intl.DateTimeFormat = function () {
      throw new Error('Intl disabled for test')
    }
  }
  const mod = require(MOD)
  // 触发 supportsIntl 探测发生在被破坏的环境里
  mod.zoneTime('Asia/Shanghai', new Date())
  Intl.DateTimeFormat = RealDTF
  return mod
}

const tzFallback = loadFresh(true)
const tzIntl = loadFresh(false)

// 2026 年各夏令时切换点（UTC 毫秒）
const BOUNDARIES = [
  Date.UTC(2026, 2, 8, 10, 0), // 美国春令 3月第2个周日（美西 02:00 = 10:00 UTC）
  Date.UTC(2026, 2, 8, 7, 0), // 美国春令（美东 02:00 = 07:00 UTC）
  Date.UTC(2026, 2, 29, 1, 0), // 欧洲春令 3月最后一个周日 01:00 UTC
  Date.UTC(2026, 9, 25, 1, 0), // 欧洲冬令 10月最后一个周日 01:00 UTC
  Date.UTC(2026, 10, 1, 6, 0), // 美国冬令 11月第1个周日（美东）
  Date.UTC(2026, 10, 1, 9, 0) // 美国冬令（美西）
]

const samples = []
for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 6 * 3600 * 1000) {
  samples.push(t)
}
for (const b of BOUNDARIES) {
  for (let t = b - 4 * 3600 * 1000; t <= b + 4 * 3600 * 1000; t += 15 * 60 * 1000) {
    samples.push(t)
  }
}

let failed = 0
for (const zone of tzIntl.ZONES) {
  let mismatches = 0
  for (const t of samples) {
    const at = new Date(t)
    const a = tzIntl.zoneTime(zone.key, at)
    const b = tzFallback.zoneTime(zone.key, at)
    if (a.hour !== b.hour || a.minute !== b.minute) {
      if (mismatches < 3) {
        process.stdout.write(
          `MISMATCH ${zone.label} @ ${at.toISOString()} intl=${tzIntl.formatTime(a)} fallback=${tzFallback.formatTime(b)}\n`
        )
      }
      mismatches += 1
    }
  }
  if (mismatches > 0) {
    failed += 1
    process.stdout.write(`FAIL ${zone.label}: ${mismatches}/${samples.length} 个采样不一致\n`)
  } else {
    process.stdout.write(`OK   ${zone.label}: ${samples.length} 个采样全部一致\n`)
  }
}

// formatTime 补零
const padCases = [
  [{ hour: 0, minute: 0 }, '00:00'],
  [{ hour: 9, minute: 5 }, '09:05'],
  [{ hour: 23, minute: 59 }, '23:59']
]
for (const [input, expect] of padCases) {
  const got = tzIntl.formatTime(input)
  if (got !== expect) {
    failed += 1
    process.stdout.write(`FAIL formatTime(${JSON.stringify(input)}) = ${got}，期望 ${expect}\n`)
  }
}

if (failed) {
  process.stdout.write(`\n共 ${failed} 项失败\n`)
  process.exitCode = 1
} else {
  process.stdout.write('\n全部通过\n')
}
