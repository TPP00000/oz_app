// pages/index/index.js - 茄茄小屋主页（横向全景房间）
const api = require('../../utils/api')
const ui = require('../../utils/ui')

const app = getApp()

// 全景图原始比例（2560x1024 横向长图）
const PANO_RATIO = 2560 / 1024

// 树精灵：热区=本体（树+盆），图像=含阴影完整范围（img 为相对热区的百分比偏移）
const TREE_RECT = { left: 22.07, top: 48.24, width: 7.77, height: 29.59 }
const TREE_IMG = { left: 0, top: 0, width: 100, height: 100 }

// 可交互物件精灵（坐标由抠图/裁切脚本输出）
// hot 区=本体可点击范围；img=精灵图相对热区的摆放（含阴影，超出热区部分不可点击）
const SPRITES = [
  { key: 'window', name: '窗户', src: 'sp-window.webp', left: 0, top: 0.1, width: 13.28, height: 78.22, img: { left: 0, top: 0, width: 100, height: 100 } },
  { key: 'bookshelf', name: '书柜', src: 'sp-bookshelf.webp', left: 13.01, top: 18.46, width: 11.72, height: 55.57, img: { left: 0, top: 0, width: 100, height: 100 } },
  { key: 'kitchen', name: '厨房', src: 'sp-kitchen.webp', left: 26.41, top: 21.78, width: 11.29, height: 48.44, img: { left: 0, top: 0, width: 100, height: 100 } },
  { key: 'notebook', name: '手账本', src: 'sp-notebook.webp', left: 27.89, top: 70.51, width: 9.57, height: 9.57, img: { left: 0, top: 0, width: 100, height: 100 } },
  { key: 'painting', name: '挂画', src: 'sp-painting.webp', left: 42.34, top: 25.59, width: 6.76, height: 19.63, img: { left: -1.2, top: 0, width: 102.3, height: 101 } },
  { key: 'eggBig', name: '大茄子', src: 'sp-egg-big.webp', left: 40.31, top: 49.02, width: 6.25, height: 19.43, img: { left: 0, top: 0, width: 100, height: 100 } },
  { key: 'eggSmall', name: '小茄子', src: 'sp-egg-small.webp', left: 44.88, top: 54.79, width: 4.69, height: 14.55, img: { left: 0, top: 0, width: 100, height: 100 } },
  { key: 'shelf', name: '置物架', src: 'sp-shelf.webp', left: 51.33, top: 27.83, width: 8.95, height: 60.84, img: { left: 0, top: 0, width: 100, height: 100 } },
  { key: 'doorBig', name: '大茄子的房间', src: 'sp-door-big.webp', left: 63.28, top: 12.99, width: 13.79, height: 74.9, img: { left: 0, top: 0, width: 100, height: 100 } },
  { key: 'doorSmall', name: '小茄子的房间', src: 'sp-door-small.webp', left: 82.81, top: 13.18, width: 14.8, height: 77.44, img: { left: 0, top: 0, width: 100, height: 100 } }
]

// 尚未精灵化的占位热区（椭圆柔光反馈）
const PLACEHOLDERS = [
  { key: 'sofa', name: '沙发', left: 35.2, top: 50.8, width: 16.2, height: 28.8 }
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
    placeholders: PLACEHOLDERS
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

      this.hasLoaded = true
      this.setData({
        loading: false,
        refreshing: false,
        daysTogether: this.calcDays(result.couple.boundAt),
        pendingForMe
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
    const name = e.currentTarget.dataset.name
    ui.toast(this, `${name}还在装修中，敬请期待 ✨`)
  },

  onRetry() {
    this.loadHome()
  }
})
