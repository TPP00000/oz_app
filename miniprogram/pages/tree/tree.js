// pages/tree/tree.js - 茄茄愿望树页
const api = require('../../utils/api')
const ui = require('../../utils/ui')

// 树冠区域内最多挂 8 颗果子的固定位置（相对树容器的百分比）
const FRUIT_SLOTS = [
  { left: 16, top: 8 },
  { left: 56, top: 5 },
  { left: 34, top: 18 },
  { left: 70, top: 16 },
  { left: 8, top: 28 },
  { left: 46, top: 30 },
  { left: 74, top: 34 },
  { left: 26, top: 42 }
]

const MAX_TREE_FRUITS = FRUIT_SLOTS.length

Page({
  data: {
    loading: true,
    refreshing: false,
    fruits: [],
    allCards: [],
    safeTop: 20
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
    this.loadCards()
  },

  async loadCards() {
    // 首次进入显示全屏加载；之后返回页面时只在后台静默刷新
    const firstLoad = !this.hasLoaded
    if (firstLoad) {
      this.setData({ loading: true })
    } else {
      this.setData({ refreshing: true })
    }
    try {
      const cards = await api.call('card.list')
      const allCards = cards.map((card) => ({
        id: card.id,
        question: card.question,
        // 旧数据没有品种字段时按苹果显示（与云函数兜底一致）
        species: card.species || 'apple',
        status: this.fruitStatus(card),
        statusText: this.statusText(card)
      }))
      const fruits = allCards.slice(0, MAX_TREE_FRUITS).map((card, i) => ({
        id: card.id,
        left: FRUIT_SLOTS[i].left,
        top: FRUIT_SLOTS[i].top,
        species: card.species,
        status: card.status
      }))
      this.hasLoaded = true
      this.setData({ loading: false, refreshing: false, fruits, allCards })
    } catch (err) {
      this.setData({ loading: false, refreshing: false })
      ui.showError(this, err)
    }
  },

  // waiting: 对方问我、待我回答 / mine: 我问对方、等 TA / done: 已完成
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

  onTapFruit(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/card/card?id=${id}` })
  },

  onPlant() {
    wx.navigateTo({ url: '/pages/card/card?mode=create' })
  }
})
