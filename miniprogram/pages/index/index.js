// pages/index/index.js - 小屋主页
const api = require('../../utils/api')

const app = getApp()

Page({
  data: {
    loading: true,
    loadFailed: false,
    daysTogether: 0,
    pendingForMe: 0
  },

  onShow() {
    this.loadHome()
  },

  async loadHome() {
    this.setData({ loading: true, loadFailed: false })
    try {
      const result = await api.call('user.init')
      app.globalData.openid = result.openid
      app.globalData.couple = result.couple

      if (!result.couple) {
        wx.redirectTo({ url: '/pages/bind/bind' })
        return
      }

      const cards = await api.call('card.list')
      const pendingForMe = cards.filter(
        (c) => c.status === 'pending' && !c.askedByMe
      ).length

      this.setData({
        loading: false,
        daysTogether: this.calcDays(result.couple.boundAt),
        pendingForMe
      })
    } catch (err) {
      this.setData({ loading: false, loadFailed: true })
      api.showError(err)
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

  onRetry() {
    this.loadHome()
  }
})
