// pages/overview/overview.js - 小屋手账（互动数据总览，木牌进入的辅助页面）
const api = require('../../utils/api')
const ui = require('../../utils/ui')

const app = getApp()

const RECENT_LIMIT = 6

Page({
  data: {
    loading: true,
    safeTop: 20,
    days: 0,
    stats: { waiting: 0, mine: 0, done: 0, total: 0 },
    recent: []
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
      const stats = {
        waiting: cards.filter((c) => c.status === 'pending' && !c.askedByMe).length,
        mine: cards.filter((c) => c.status === 'pending' && c.askedByMe).length,
        done: cards.filter((c) => c.status === 'answered').length,
        total: cards.length
      }
      const recent = cards.slice(0, RECENT_LIMIT).map((card) => ({
        id: card.id,
        question: card.question,
        species: card.species || 'apple',
        statusText: this.statusText(card),
        status: this.fruitStatus(card),
        date: this.fmtDate(card.createdAt)
      }))

      this.setData({
        loading: false,
        days: this.calcDays(result.couple.boundAt),
        stats,
        recent
      })
    } catch (err) {
      this.setData({ loading: false })
      ui.showError(this, err)
    }
  },

  fruitStatus(card) {
    if (card.status === 'answered') {
      return 'done'
    }
    return card.askedByMe ? 'mine' : 'waiting'
  },

  statusText(card) {
    if (card.status === 'answered') {
      return '已成熟'
    }
    return card.askedByMe ? '等 TA 回答' : '等你回答'
  },

  fmtDate(iso) {
    if (!iso) {
      return ''
    }
    const d = new Date(iso)
    return `${d.getMonth() + 1}月${d.getDate()}日`
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

  goCard(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/card/card?id=${id}` })
  }
})
