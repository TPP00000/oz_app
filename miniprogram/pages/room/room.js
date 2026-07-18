// pages/room/room.js - 卧室（茄子王/小茄子共用模板，独立时区与昼夜切换）
const ui = require('../../utils/ui')
const tz = require('../../utils/timezone')
const scene = require('../../utils/scene')
const config = require('../../config')

const ROOMS = {
  king: { name: '茄子王的房间', defaultZone: 'Asia/Shanghai' },
  small: { name: '小茄子的房间', defaultZone: 'Europe/Berlin' }
}

// 未启用精灵时的兜底热区（占场景图的百分比；昼夜两张图构图一致，坐标共用）
const DOOR_RECT = { left: 15.2, top: 19.5, width: 17.3, height: 58.5 }
const CLOCK_RECT = { left: 5.5, top: 18.5, width: 9.6, height: 15.5 }

// 门/钟精灵（手动抠图流水线产出，掩码存 assets-src/masks/，坐标由 apply_mask.py 打印）
// 昼夜两张精灵用同一掩码抠出，坐标共用；置 null 可退回柔光热区反馈
const DOOR_SPRITES = {
  rect: { left: 15.56, top: 18.36, width: 17.32, height: 58.79 },
  day: 'sp-room-door-day.png',
  night: 'sp-room-door-night.png'
}
const CLOCK_SPRITES = {
  rect: { left: 8.2, top: 20.8, width: 7.23, height: 11.43 },
  day: 'sp-room-clock-day.png',
  night: 'sp-room-clock-night.png'
}

// 昼夜分界：06:00 起为白天，20:00 起为夜晚
const DAY_START = 6
const NIGHT_START = 20
const TICK_MS = 30 * 1000

Page({
  data: {
    roomName: '',
    sceneSrc: '',
    sceneLoaded: false,
    isDay: true,
    timeText: '',
    zoneLabel: '',
    doorSprite: '',
    clockSprite: '',
    doorRect: DOOR_SPRITES ? DOOR_SPRITES.rect : DOOR_RECT,
    clockRect: CLOCK_SPRITES ? CLOCK_SPRITES.rect : CLOCK_RECT,
    panoWidth: 0,
    panoHeight: 0,
    scrollLeft: 0,
    chipTop: 40,
    zonePanel: null
  },

  onLoad(options) {
    this.role = options && options.role === 'small' ? 'small' : 'king'
    this.storageKey = `roomZone_${this.role}`
    this.zoneKey = this.loadZone()
    this.setData({
      // 初始视野对准床（场景横向 55% 处）
      ...scene.sceneLayout(0.55),
      roomName: ROOMS[this.role].name,
      chipTop: ui.safeTop() + 10
    })
    this.refreshClock()
  },

  onShow() {
    this.refreshClock()
    this.stopTicker()
    this.ticker = setInterval(() => this.refreshClock(), TICK_MS)
  },

  onHide() {
    this.stopTicker()
  },

  onUnload() {
    this.stopTicker()
  },

  stopTicker() {
    if (this.ticker) {
      clearInterval(this.ticker)
      this.ticker = null
    }
  },

  loadZone() {
    try {
      const saved = wx.getStorageSync(this.storageKey)
      if (saved && tz.ZONES.some((z) => z.key === saved)) {
        return saved
      }
    } catch (err) {
      console.warn(`读取 ${this.storageKey} 失败，回退默认时区`, err)
    }
    return ROOMS[this.role].defaultZone
  },

  refreshClock() {
    const time = tz.zoneTime(this.zoneKey)
    const isDay = time.hour >= DAY_START && time.hour < NIGHT_START
    const zone = tz.ZONES.find((z) => z.key === this.zoneKey)
    const sceneSrc =
      config.ROOM_ASSET_PREFIX + (isDay ? 'room-bed-day.jpg' : 'room-bed-night.jpg')
    const patch = {
      isDay,
      timeText: tz.formatTime(time),
      zoneLabel: zone ? zone.label : '',
      sceneSrc,
      doorSprite: DOOR_SPRITES
        ? config.ROOM_ASSET_PREFIX + (isDay ? DOOR_SPRITES.day : DOOR_SPRITES.night)
        : '',
      clockSprite: CLOCK_SPRITES
        ? config.ROOM_ASSET_PREFIX + (isDay ? CLOCK_SPRITES.day : CLOCK_SPRITES.night)
        : '',
      // 昼夜图切换时重新走淡入；同图刷新则保持已显示状态
      sceneLoaded: sceneSrc === this.data.sceneSrc ? this.data.sceneLoaded : false
    }
    // 时区面板开着时同步刷新面板里的各地时间
    if (this.data.zonePanel) {
      patch.zonePanel = { zones: this.buildZoneList() }
    }
    this.setData(patch)
  },

  buildZoneList() {
    return tz.ZONES.map((z) => ({
      key: z.key,
      label: z.label,
      timeText: tz.formatTime(tz.zoneTime(z.key)),
      active: z.key === this.zoneKey
    }))
  },

  onSceneLoad() {
    this.setData({ sceneLoaded: true })
  },

  onSceneError() {
    ui.toast(this, '房间还没布置好，请稍后再来')
  },

  onTapDoor() {
    scene.backToLiving()
  },

  onTapClock() {
    this.setData({ zonePanel: { zones: this.buildZoneList() } })
  },

  onPickZone(e) {
    const key = e.currentTarget.dataset.key
    if (!tz.ZONES.some((z) => z.key === key)) {
      return
    }
    this.zoneKey = key
    try {
      wx.setStorageSync(this.storageKey, key)
    } catch (err) {
      console.warn(`保存 ${this.storageKey} 失败，仅本次会话生效`, err)
    }
    this.setData({ zonePanel: null })
    this.refreshClock()
    ui.toast(this, '时钟拨好啦')
  },

  onCloseZonePanel() {
    this.setData({ zonePanel: null })
  }
})
