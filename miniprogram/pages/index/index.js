// pages/index/index.js - 茄茄小屋主页（横向全景房间）
const api = require('../../utils/api')
const ui = require('../../utils/ui')

const app = getApp()

// 全景图原始比例（2560x1024 横向长图）
const PANO_RATIO = 2560 / 1024

// 树精灵在全景图中的区域（由差异抠图输出，与精灵图逐像素对应）
const TREE_RECT = { left: 21.99, top: 47.85, width: 10.04, height: 31.54 }

// 未来可交互物件的占位热区（百分比人工标定，点击提示"装修中"）
const PLACEHOLDERS = [
  { key: 'window', name: '窗户', left: 0.5, top: 5, width: 8.5, height: 52 },
  { key: 'bookshelf', name: '书柜', left: 11.6, top: 20, width: 7, height: 53 },
  { key: 'kitchen', name: '厨房', left: 21, top: 19, width: 8.5, height: 51 },
  { key: 'sofa', name: '沙发', left: 27.7, top: 44, width: 14, height: 24 },
  { key: 'painting', name: '挂画', left: 34, top: 22, width: 5, height: 14 },
  { key: 'shelf', name: '置物架', left: 41.5, top: 28, width: 6.5, height: 46 },
  { key: 'doorBig', name: '大茄子的房间', left: 51.5, top: 12, width: 9.6, height: 62 },
  { key: 'doorSmall', name: '小茄子的房间', left: 67.2, top: 12, width: 9.4, height: 62 }
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
