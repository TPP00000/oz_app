// pages/card/card.js - 问答卡片页（出题 / 答题 / 回看）
const api = require('../../utils/api')
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
    answerMax: ANSWER_MAX
  },

  onLoad(options) {
    if (options.mode === 'create') {
      this.setData({ mode: 'create', suggestions: presets.pickRandom(3) })
      return
    }
    if (options.id) {
      this.setData({ cardId: options.id })
      this.loadCard(options.id)
      return
    }
    wx.showToast({ title: '页面参数错误', icon: 'none' })
    setTimeout(() => wx.navigateBack(), 1200)
  },

  async loadCard(id) {
    try {
      const card = await api.call('card.get', { cardId: id })
      let mode = 'view'
      if (card.status === 'pending') {
        mode = card.askedByMe ? 'waiting' : 'answer'
      }
      this.setData({ card, mode })
    } catch (err) {
      api.showError(err)
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
      wx.showToast({ title: '先写下你的问题吧', icon: 'none' })
      return
    }
    if (question.length > QUESTION_MAX) {
      wx.showToast({ title: `问题最多 ${QUESTION_MAX} 字`, icon: 'none' })
      return
    }
    await this.submit('card.create', { question }, '种下啦，等 TA 来回答 🌱')
  },

  async onSubmitAnswer() {
    const answer = this.data.answerInput.trim()
    if (!answer) {
      wx.showToast({ title: '写点什么再交卷吧', icon: 'none' })
      return
    }
    if (answer.length > ANSWER_MAX) {
      wx.showToast({ title: `回答最多 ${ANSWER_MAX} 字`, icon: 'none' })
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
      wx.showToast({ title: successMsg, icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1200)
    } catch (err) {
      api.showError(err)
      this.setData({ submitting: false })
    }
  }
})
