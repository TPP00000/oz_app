// pages/card/card.js - 问答卡片页（出题 / 答题 / 回看）
const api = require('../../utils/api')
const ui = require('../../utils/ui')
const presets = require('../../data/preset-questions')

const QUESTION_MAX = 200
const ANSWER_MAX = 500

Page({
  data: {
    mode: 'loading', // create | answer | waiting | view | loading
    cardId: '',
    card: null,
    questionInput: '',
    answerInput: '',
    suggestions: [],
    submitting: false,
    questionMax: QUESTION_MAX,
    answerMax: ANSWER_MAX,
    safeTop: 20
  },

  onShareAppMessage() {
    return {
      title: '茄茄小屋 · 我们俩的专属小屋',
      path: '/pages/index/index',
      imageUrl: '/assets/room-pano-day.jpg'
    }
  },

  onLoad(options) {
    this.setData({ safeTop: ui.safeTop() })
    if (options.mode === 'create') {
      this.setData({ mode: 'create', suggestions: presets.pickRandom(3) })
      return
    }
    if (options.id) {
      this.setData({ cardId: options.id })
      this.loadCard(options.id)
      return
    }
    ui.toast(this, '页面参数错误')
    setTimeout(() => wx.navigateBack(), 1200)
  },

  async loadCard(id) {
    try {
      const card = await api.call('card.get', { cardId: id })
      let mode = 'view'
      if (card.status === 'pending') {
        mode = card.askedByMe ? 'waiting' : 'answer'
      }
      this.setData({
        card: { ...card, species: card.species || 'apple' },
        mode
      })
    } catch (err) {
      ui.showError(this, err)
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  onQuestionInput(e) {
    this.setData({ questionInput: e.detail.value })
  },

  onAnswerInput(e) {
    this.setData({ answerInput: e.detail.value })
  },

  onPickSuggestion(e) {
    this.setData({ questionInput: e.currentTarget.dataset.q })
  },

  onRefreshSuggestions() {
    this.setData({ suggestions: presets.pickRandom(3) })
  },

  async onSubmitQuestion() {
    const question = this.data.questionInput.trim()
    if (!question) {
      ui.toast(this, '先写下你的问题吧')
      return
    }
    if (question.length > QUESTION_MAX) {
      ui.toast(this, `问题最多 ${QUESTION_MAX} 字`)
      return
    }
    await this.submit('card.create', { question }, '种下啦，等 TA 来回答 🌱')
  },

  async onSubmitAnswer() {
    const answer = this.data.answerInput.trim()
    if (!answer) {
      ui.toast(this, '写点什么再交卷吧')
      return
    }
    if (answer.length > ANSWER_MAX) {
      ui.toast(this, `回答最多 ${ANSWER_MAX} 字`)
      return
    }
    await this.submit(
      'card.answer',
      { cardId: this.data.cardId, answer },
      '果子成熟啦 🍎'
    )
  },

  async submit(action, payload, successMsg) {
    if (this.data.submitting) {
      return
    }
    this.setData({ submitting: true })
    try {
      await api.call(action, payload)
      ui.toast(this, successMsg)
      setTimeout(() => wx.navigateBack(), 1200)
    } catch (err) {
      ui.showError(this, err)
      this.setData({ submitting: false })
    }
  }
})
