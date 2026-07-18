// pages/tree/tree.js - 茄茄愿望树页（成长树 + 分类问答）
const api = require('../../utils/api')
const ui = require('../../utils/ui')
const { TREE_STAGE_PREFIX } = require('../../config')

// 成长档位：问题总数达到阈值即升档
const STAGE_THRESHOLDS = [10, 50, 100, 300, 500]
const STAGE_NAMES = ['嫩芽', '小树苗', '小小树', '茂盛树', '繁花树', '参天树']

Page({
  data: {
    loading: true,
    refreshing: false,
    safeTop: 20,
    treeSrc: '',
    stageName: '',
    stage: 0,
    growText: '',
    stats: { askedByMe: 0, askedByTa: 0, answeredByMe: 0, answeredByTa: 0, total: 0 },
    activeTab: 'forMe',
    listForMe: [],
    listByMe: []
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
    const firstLoad = !this.hasLoaded
    if (firstLoad) {
      this.setData({ loading: true })
    } else {
      this.setData({ refreshing: true })
    }
    try {
      const cards = await api.call('card.list')
      this.hasLoaded = true
      this.setData({
        loading: false,
        refreshing: false,
        ...this.buildView(cards)
      })
    } catch (err) {
      this.setData({ loading: false, refreshing: false })
      ui.showError(this, err)
    }
  },

  buildView(cards) {
    const total = cards.length
    const stage = STAGE_THRESHOLDS.filter((t) => total >= t).length
    const growText =
      stage >= STAGE_THRESHOLDS.length
        ? '愿望树已经长到最大啦'
        : `再种 ${STAGE_THRESHOLDS[stage] - total} 个问题就会长大`

    const stats = {
      total,
      askedByMe: cards.filter((c) => c.askedByMe).length,
      askedByTa: cards.filter((c) => !c.askedByMe).length,
      answeredByMe: cards.filter((c) => !c.askedByMe && c.status === 'answered').length,
      answeredByTa: cards.filter((c) => c.askedByMe && c.status === 'answered').length
    }

    const toItem = (card) => ({
      id: card.id,
      question: card.question,
      species: card.species || 'apple',
      status: card.status === 'answered' ? 'done' : 'pending',
      statusText:
        card.status === 'answered' ? '已成熟' : card.askedByMe ? '等 TA 回答' : '等你回答'
    })

    return {
      treeSrc: TREE_STAGE_PREFIX
        ? `${TREE_STAGE_PREFIX}stage-${stage}.png`
        : '/assets/tree-bare-day.png',
      stage,
      stageName: STAGE_NAMES[stage],
      growText,
      stats,
      listForMe: cards.filter((c) => !c.askedByMe).map(toItem),
      listByMe: cards.filter((c) => c.askedByMe).map(toItem)
    }
  },

  onSwitchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  onTapCard(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/card/card?id=${id}` })
  },

  onPlant() {
    wx.navigateTo({ url: '/pages/card/card?mode=create' })
  }
})
