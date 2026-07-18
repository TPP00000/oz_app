// utils/timezone.js - 房间时区：可选时区列表与当地时间计算
// 优先用 Intl 按 IANA 时区精确计算（自动含夏令时）；
// 少数不支持 Intl 的旧机型退回手写偏移 + 欧/美夏令时规则

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

// offset 为标准时（非夏令时）相对 UTC 的分钟数；dst 为夏令时规则
const ZONES = [
  { key: 'Asia/Shanghai', label: '中国', offset: 480, dst: null },
  { key: 'Europe/Berlin', label: '德国', offset: 60, dst: 'eu' },
  { key: 'Asia/Tokyo', label: '日本', offset: 540, dst: null },
  { key: 'Europe/London', label: '英国', offset: 0, dst: 'eu' },
  { key: 'America/New_York', label: '美国东部', offset: -300, dst: 'us' },
  { key: 'America/Los_Angeles', label: '美国西部', offset: -480, dst: 'us' }
]

let intlSupported = null
const formatters = {}

function supportsIntl() {
  if (intlSupported === null) {
    try {
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Shanghai',
        hour: 'numeric'
      }).format(new Date())
      intlSupported = true
    } catch (err) {
      intlSupported = false
    }
  }
  return intlSupported
}

// 每个时区只构建一次格式化器（refreshClock 每 30s 会调用）
// hour12 与 hourCycle 同时给：旧 Intl 实现可能不认 hourCycle，
// 只靠它会退回 12 小时制，把晚上 8 点解析成 8 从而昼夜判断出错
function getFormatter(key) {
  if (!formatters[key]) {
    formatters[key] = new Intl.DateTimeFormat('en-US', {
      timeZone: key,
      hour12: false,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  return formatters[key]
}

// 某年 month(1-12) 月第 n 个周日的 UTC 零点毫秒数
function nthSundayUtc(year, month, n) {
  const first = Date.UTC(year, month - 1, 1)
  const firstDay = new Date(first).getUTCDay()
  const offsetDays = (7 - firstDay) % 7 + (n - 1) * 7
  return first + offsetDays * 24 * HOUR
}

// 某年 month(1-12) 月最后一个周日的 UTC 零点毫秒数
function lastSundayUtc(year, month) {
  const lastDate = new Date(Date.UTC(year, month, 0))
  const day = lastDate.getUTCDay()
  return Date.UTC(year, month - 1, lastDate.getUTCDate() - day)
}

function dstActive(zone, now) {
  if (!zone.dst) {
    return false
  }
  const y = now.getUTCFullYear()
  const t = now.getTime()
  if (zone.dst === 'eu') {
    // 欧洲：3 月最后一个周日 01:00 UTC ~ 10 月最后一个周日 01:00 UTC（全欧统一时刻）
    return t >= lastSundayUtc(y, 3) + HOUR && t < lastSundayUtc(y, 10) + HOUR
  }
  if (zone.dst === 'us') {
    // 美国：3 月第二个周日当地 02:00 起，11 月第一个周日当地 02:00 止
    // 切换时刻按各时区自己的偏移换算成 UTC（美东和美西相差 3 小时）
    const start = nthSundayUtc(y, 3, 2) + 2 * HOUR - zone.offset * MINUTE
    const end = nthSundayUtc(y, 11, 1) + 2 * HOUR - (zone.offset + 60) * MINUTE
    return t >= start && t < end
  }
  return false
}

/**
 * 计算某时区的当前时分
 * @param {string} key ZONES 中的时区 key
 * @param {Date} [at] 指定时刻（缺省为当前时间；测试用）
 * @returns {{ hour: number, minute: number }}
 */
function zoneTime(key, at) {
  const zone = ZONES.find((z) => z.key === key) || ZONES[0]
  const now = at || new Date()
  if (supportsIntl()) {
    try {
      const parts = getFormatter(zone.key).formatToParts(now)
      const pick = (type) => {
        const p = parts.find((item) => item.type === type)
        return p ? Number(p.value) : NaN
      }
      const hour = pick('hour')
      const minute = pick('minute')
      if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
        return { hour: hour % 24, minute }
      }
    } catch (err) {
      intlSupported = false // 真机 Intl 异常时永久回退到手写偏移
    }
  }
  const offset = zone.offset + (dstActive(zone, now) ? 60 : 0)
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const local = ((utcMinutes + offset) % 1440 + 1440) % 1440
  return { hour: Math.floor(local / 60), minute: local % 60 }
}

/**
 * 格式化为 HH:MM
 * @param {{ hour: number, minute: number }} time
 * @returns {string}
 */
function formatTime(time) {
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
  return `${pad(time.hour)}:${pad(time.minute)}`
}

module.exports = { ZONES, zoneTime, formatTime }
