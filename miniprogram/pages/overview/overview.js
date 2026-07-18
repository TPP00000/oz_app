// pages/overview/overview.js - 小屋手账（功能中枢：各模块的集中入口）
const api = require('../../utils/api')
const ui = require('../../utils/ui')

const app = getApp()

Page({
  data: {
    loading: true,
    safeTop: 20,
    days: 0,
    treeDesc: '',
    modules: []
  },

  onLoad() {
    this.setData({ safeTop: ui.safeTop() })
  },

  onShareAppMessage() {
    return {
      title: '茄茄小屋 · 我们俩的专属小屋',
      path: '/pages/index/index',
      imageUrl: '/assets/share-card.jpg'
    }
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    try {
      const result = await api.call('user.init')
      if (!result.couple) {
        wx.redirectTo({ url: '/pages/bind/bind' })
        return
      }
      app.globalData.couple = result.couple

      const cards = await api.call('card.list')
      const waiting = cards.filter((c) => c.status === 'pending' && !c.askedByMe).length
      const treeDesc = waiting > 0
        ? `${cards.length} 颗果子 · ${waiting} 颗等你回答`
        : `${cards.length} 颗果子`

      this.setData({
        loading: false,
        days: this.calcDays(result.couple.boundAt),
        modules: this.buildModules(treeDesc, waiting)
      })
    } catch (err) {
      this.setData({ loading: false })
      ui.showError(this, err)
    }
  },

  buildModules(treeDesc, waiting) {
    return [
      {
        key: 'tree',
        icon: '/assets/fruit-eggplant.png',
        title: '愿望树',
        desc: treeDesc,
        badge: waiting > 0 ? waiting : 0,
        url: '/pages/tree/tree'
      },
      {
        key: 'photos',
        icon: '/assets/sp-painting.png',
        title: '照片墙',
        desc: '记录我们的日常',
        badge: 0,
        url: '/pages/photos/photos'
      },
      {
        key: 'notes',
        icon: '/assets/sp-notebook.png',
        title: '留言板',
        desc: '手写的小纸条',
        badge: 0,
        url: '/pages/notes/notes'
      },
      {
        key: 'more',
        icon: '/assets/house-eggplant.png',
        title: '更多角落',
        desc: '小屋还在装修',
        badge: 0,
        url: ''
      }
    ]
  },

  calcDays(boundAt) {
    if (!boundAt) {
      return 1
    }
    const ms = Date.now() - new Date(boundAt).getTime()
    return Math.max(1, Math.floor(ms / (24 * 60 * 60 * 1000)) + 1)
  },

  onTapModule(e) {
    const { url, title } = e.currentTarget.dataset
    if (url) {
      wx.navigateTo({ url })
    } else {
      ui.toast(this, `${title}还在装修中，敬请期待 ✨`)
    }
  }
})
