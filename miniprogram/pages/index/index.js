// pages/index/index.js - 茄茄小屋主页（横向全景房间）
const api = require('../../utils/api')
const ui = require('../../utils/ui')
const config = require('../../config')

const app = getApp()

// 全景图原始比例（2560x1024 横向长图）
const PANO_RATIO = 2560 / 1024

// 树精灵：热区=本体（树+盆），图像=含阴影完整范围（img 为相对热区的百分比偏移）
const TREE_RECT = { left: 22.07, top: 48.24, width: 7.77, height: 29.59 }
const TREE_IMG = { left: 0, top: 0, width: 100, height: 100 }

// 可交互物件精灵（坐标由抠图/裁切脚本输出）
// hot 区=本体可点击范围；img=精灵图相对热区的摆放（含阴影，超出热区部分不可点击）
const SPRITES = [
  { key: 'window', name: '窗户', src: 'sp-window.png', left: 0, top: 0.1, width: 13.28, height: 78.22, img: { left: 0, top: 0, width: 100, height: 100 } },
  { key: 'bookshelf', name: '书柜', src: 'sp-bookshelf.png', left: 13.01, top: 18.46, width: 11.72, height: 55.57, img: { left: 0, top: 0, width: 100, height: 100 } },
  { key: 'kitchen', name: '厨房', src: 'sp-kitchen.png', url: '/pages/kitchen/kitchen', left: 26.41, top: 21.78, width: 11.29, height: 48.44, img: { left: 0, top: 0, width: 100, height: 100 } },
  { key: 'notebook', name: '留言板', src: 'sp-notebook.png', url: '/pages/notes/notes', left: 27.89, top: 70.51, width: 9.57, height: 9.57, img: { left: 0, top: 0, width: 100, height: 100 } },
  { key: 'painting', name: '照片墙', src: 'sp-painting.png', url: '/pages/photos/photos', left: 42.34, top: 25.59, width: 6.76, height: 19.63, img: { left: -1.2, top: 0, width: 102.3, height: 101 } },
  { key: 'eggBig', name: '茄子王', src: 'sp-egg-big.png', left: 40.31, top: 49.02, width: 6.25, height: 19.43, img: { left: 0, top: 0, width: 100, height: 100 } },
  { key: 'eggSmall', name: '小茄子', src: 'sp-egg-small.png', left: 44.88, top: 54.79, width: 4.69, height: 14.55, img: { left: 0, top: 0, width: 100, height: 100 } },
  { key: 'shelf', name: '置物架', src: 'sp-shelf.png', left: 51.33, top: 27.83, width: 8.95, height: 60.84, img: { left: 0, top: 0, width: 100, height: 100 } },
  { key: 'doorBig', name: '茄子王的房间', src: 'sp-door-big.png', url: '/pages/room/room?role=king', left: 63.28, top: 12.99, width: 13.79, height: 74.9, img: { left: 0, top: 0, width: 100, height: 100 } },
  { key: 'doorSmall', name: '小茄子的房间', src: 'sp-door-small.png', url: '/pages/room/room?role=small', left: 82.81, top: 13.18, width: 14.8, height: 77.44, img: { left: 0, top: 0, width: 100, height: 100 } }
]

// 尚未精灵化的占位热区（椭圆柔光反馈）
const PLACEHOLDERS = [
  { key: 'sofa', name: '沙发', left: 35.2, top: 50.8, width: 16.2, height: 28.8 }
]

// ===== 茄子角色/造型/互动 =====
const AVATAR_PREFIX = config.CLOUD_FILE_BASE + 'avatars/'

// 各造型精灵在全景中的区域（由抠图脚本输出）
const AVATAR_RECTS = {
  'king-sunglass': { left: 38.71, top: 28.81, width: 10.62, height: 48.73 },
  'king-hearteye': { left: 40.27, top: 31.54, width: 8.63, height: 37.3 },
  'king-humming': { left: 40.27, top: 33.01, width: 8.98, height: 35.55 },
  'king-sleeping': { left: 38.71, top: 28.81, width: 10.78, height: 48.73 },
  'small-sunglass': { left: 41.29, top: 33.69, width: 8.32, height: 35.74 },
  'small-hearteye': { left: 42.62, top: 33.79, width: 7.07, height: 36.04 },
  'small-humming': { left: 45.04, top: 49.9, width: 5.82, height: 19.14 },
  'small-sleeping': { left: 40.66, top: 33.89, width: 10.82, height: 36.04 },
  'duo-tietie': { left: 40.47, top: 44.04, width: 8.98, height: 25.39 },
  'duo-qinqin': { left: 40.47, top: 38.09, width: 9.53, height: 31.25 },
  'duo-qinqin-king': { left: 40.43, top: 38.09, width: 9.77, height: 31.05 }
}

// 单体造型贴图版本号：素材重做时只升对应键的版本（新文件名可绕开云端缓存）
const AVATAR_VERSIONS = {
  'small-humming': 3,
  'duo-tietie': 2,
  'duo-qinqin': 3,
  'duo-qinqin-king': 5
}

const ROLE_NAMES = { king: '茄子王', small: '小茄子' }
const STYLE_OPTIONS = [
  { key: 'normal', label: '素颜' },
  { key: 'sunglass', label: '戴墨镜' },
  { key: 'hearteye', label: '心心眼' },
  { key: 'humming', label: '哼歌' },
  { key: 'sleeping', label: '睡觉' }
]
const DUO_OPTIONS = [
  { key: 'tietie', label: '贴贴 🍆🍆' },
  { key: 'qinqin', label: '亲亲 💋' }
]

Page({
  data: {
    loading: true,
    loadFailed: false,
    refreshing: false,
    daysTogether: 0,
    pendingForMe: 0,
    panoWidth: 0,
    panoHeight: 0,
    scrollLeft: 0,
    chipTop: 40,
    treeRect: TREE_RECT,
    treeImg: TREE_IMG,
    sprites: SPRITES,
    placeholders: PLACEHOLDERS,
    avatar: null,
    overlays: [],
    duoRect: null,
    rolePick: false,
    roleTaken: '',
    panel: null,
    portraitKing: AVATAR_PREFIX + 'av-portrait-king.png',
    portraitSmall: AVATAR_PREFIX + 'av-portrait-small.png'
  },

  onLoad(options) {
    // 分享链接可携带邀请码，未绑定时转交给绑定页自动填入
    this.inviteParam = (options && options.invite) || ''
    this.layoutPano()
  },

  onShareAppMessage() {
    return {
      title: '茄茄小屋 · 我们俩的专属小屋',
      path: '/pages/index/index',
      imageUrl: '/assets/share-card.jpg'
    }
  },

  onShow() {
    this.loadHome()
  },

  // 全景图高度撑满屏幕，宽度按比例展开；初始视野对准桌上的树
  layoutPano() {
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const panoHeight = win.windowHeight
    const panoWidth = Math.round(panoHeight * PANO_RATIO)
    const treeCenterX = ((TREE_RECT.left + TREE_RECT.width / 2) / 100) * panoWidth
    this.setData({
      panoWidth,
      panoHeight,
      scrollLeft: Math.max(0, Math.round(treeCenterX - win.windowWidth / 2)),
      chipTop: ui.safeTop() + 10
    })
  },

  async loadHome() {
    // 首次进入显示全屏加载；之后返回页面时只在后台静默刷新
    const firstLoad = !this.hasLoaded
    if (firstLoad) {
      this.setData({ loading: true, loadFailed: false })
    } else {
      this.setData({ refreshing: true })
    }
    try {
      const result = await api.call('user.init')
      app.globalData.openid = result.openid
      app.globalData.couple = result.couple

      if (!result.couple) {
        const suffix = this.inviteParam
          ? `?invite=${encodeURIComponent(this.inviteParam)}`
          : ''
        wx.redirectTo({ url: `/pages/bind/bind${suffix}` })
        return
      }

      const cards = await api.call('card.list')
      const pendingForMe = cards.filter(
        (c) => c.status === 'pending' && !c.askedByMe
      ).length

      let avatar = null
      try {
        avatar = await api.call('avatar.state')
      } catch (err) {
        avatar = null // 云函数未更新时静默降级
      }

      this.hasLoaded = true
      this.setData({
        loading: false,
        refreshing: false,
        daysTogether: this.calcDays(result.couple.boundAt),
        pendingForMe,
        ...this.buildAvatarView(avatar)
      })
    } catch (err) {
      if (this.hasLoaded) {
        this.setData({ refreshing: false })
      } else {
        this.setData({ loading: false, loadFailed: true })
      }
      ui.showError(this, err)
    }
  },

  calcDays(boundAt) {
    if (!boundAt) {
      return 1
    }
    const ms = Date.now() - new Date(boundAt).getTime()
    return Math.max(1, Math.floor(ms / (24 * 60 * 60 * 1000)) + 1)
  },

  goTree() {
    wx.navigateTo({ url: '/pages/tree/tree' })
  },

  goOverview() {
    wx.navigateTo({ url: '/pages/overview/overview' })
  },

  onTapPlaceholder(e) {
    const { key, name, url } = e.currentTarget.dataset
    if (key === 'eggBig' || key === 'eggSmall') {
      this.onTapEgg(key === 'eggBig' ? 'king' : 'small')
      return
    }
    if (url) {
      wx.navigateTo({
        url,
        fail: (err) => {
          console.warn(`跳转 ${url} 失败`, err)
          ui.toast(this, `${name}的门卡住了，再试一次吧`)
        }
      })
      return
    }
    ui.toast(this, `${name}还在装修中，敬请期待 ✨`)
  },

  // ===== 茄子角色/造型/互动 =====

  // 由状态计算沙发上的叠加图层：双人姿势优先，否则各自造型
  buildAvatarView(avatar) {
    if (!avatar) {
      return { avatar: null, overlays: [], duoRect: null, rolePick: false }
    }
    let overlays = []
    let duoRect = null
    if (avatar.duo) {
      // 亲亲分方向：茄子王发起时用"茄子王亲小茄子"的专属贴图（贴贴对称，不分）
      let key = `duo-${avatar.duo}`
      if (avatar.duo === 'qinqin' && avatar.duoBy === 'king' && AVATAR_RECTS['duo-qinqin-king']) {
        key = 'duo-qinqin-king'
      }
      if (AVATAR_RECTS[key]) {
        // 合体贴图同样走版本号机制（无版本号时用无后缀的初版文件名）
        const duoVer = AVATAR_VERSIONS[key] || ''
        overlays = [
          { key, src: AVATAR_PREFIX + `av-${key}${duoVer}.png`, rect: AVATAR_RECTS[key] }
        ]
        duoRect = AVATAR_RECTS[key]
      }
    } else {
      const styleOf = {}
      if (avatar.myRole) {
        styleOf[avatar.myRole] = avatar.myStyle
      }
      if (avatar.taRole) {
        styleOf[avatar.taRole] = avatar.taStyle
      }
      for (const role of ['king', 'small']) {
        const style = styleOf[role]
        if (style && style !== 'normal' && AVATAR_RECTS[`${role}-${style}`]) {
          const key = `${role}-${style}`
          // 单体造型用带版本后缀的整只覆盖版文件（文件与坐标成对更新）
          const ver = AVATAR_VERSIONS[key] || 2
          overlays.push({ key, src: AVATAR_PREFIX + `av-${key}${ver}.png`, rect: AVATAR_RECTS[key] })
        }
      }
    }
    return {
      avatar,
      overlays,
      duoRect,
      rolePick: !avatar.myRole,
      roleTaken: avatar.taRole || ''
    }
  },

  async refreshAvatar() {
    try {
      const avatar = await api.call('avatar.state')
      this.setData(this.buildAvatarView(avatar))
    } catch (err) {
      ui.showError(this, err)
    }
  },

  async onChooseRole(e) {
    const role = e.currentTarget.dataset.role
    if (role === this.data.roleTaken) {
      ui.toast(this, '这个角色已经被 TA 选啦')
      return
    }
    try {
      const avatar = await api.call('avatar.choose', { role })
      this.setData(this.buildAvatarView(avatar))
      ui.toast(this, `你现在是${ROLE_NAMES[role]}啦`)
    } catch (err) {
      ui.showError(this, err)
    }
  },

  onTapEgg(role) {
    const avatar = this.data.avatar
    if (!avatar) {
      ui.toast(this, '茄子们还没准备好，稍后再试')
      return
    }
    if (!avatar.myRole) {
      this.setData({ rolePick: true })
      return
    }
    if (role === avatar.myRole) {
      this.setData({
        panel: {
          title: `${ROLE_NAMES[role]}的造型（这是你）`,
          type: 'style',
          options: STYLE_OPTIONS.map((o) => ({
            ...o,
            active: o.key === avatar.myStyle && !avatar.duo
          }))
        }
      })
    } else {
      this.setData({
        panel: {
          title: `对${ROLE_NAMES[role]}做点什么（这是 TA）`,
          type: 'duo',
          options: DUO_OPTIONS.map((o) => ({ ...o, active: o.key === avatar.duo }))
        }
      })
    }
  },

  // 双人姿势中点击合体区域：既能换姿势也能换自己造型（换造型会分开）
  onTapDuo() {
    const avatar = this.data.avatar
    if (!avatar || !avatar.myRole) {
      return
    }
    this.setData({
      panel: {
        title: '现在是合体状态',
        type: 'mixed',
        options: [
          ...DUO_OPTIONS.map((o) => ({ ...o, active: o.key === avatar.duo, kind: 'duo' })),
          ...STYLE_OPTIONS.map((o) => ({
            ...o,
            label: `${o.label}（会分开哦）`,
            kind: 'style'
          }))
        ]
      }
    })
  },

  async onPanelSelect(e) {
    const { key, kind } = e.currentTarget.dataset
    const type = this.data.panel && this.data.panel.type
    this.setData({ panel: null })
    try {
      if (kind === 'duo' || type === 'duo') {
        const avatar = await api.call('avatar.duo', { type: key })
        this.setData(this.buildAvatarView(avatar))
        ui.toast(this, key === 'tietie' ? '贴贴～ 🍆🍆' : 'mua～ 💋')
      } else {
        const avatar = await api.call('avatar.style', { style: key })
        this.setData(this.buildAvatarView(avatar))
        ui.toast(this, '换好造型啦')
      }
    } catch (err) {
      ui.showError(this, err)
    }
  },

  onClosePanel() {
    this.setData({ panel: null })
  },

  onCloseRolePick() {
    this.setData({ rolePick: false })
  },

  onRetry() {
    this.loadHome()
  }
})
