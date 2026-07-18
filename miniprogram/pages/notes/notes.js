// pages/notes/notes.js - 留言板（手写纸条墙）
const api = require('../../utils/api')
const ui = require('../../utils/ui')

const TILTS = [-1.8, 1.4, -1.1, 2, -1.5, 1]

Page({
  data: {
    loading: true,
    refreshing: false,
    safeTop: 20,
    leftCol: [],
    rightCol: [],
    total: 0
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
    this.loadNotes()
  },

  async loadNotes() {
    const firstLoad = !this.hasLoaded
    if (firstLoad) {
      this.setData({ loading: true })
    } else {
      this.setData({ refreshing: true })
    }
    try {
      const notes = await api.call('note.list')
      this.hasLoaded = true
      const items = notes.map((n, i) => ({
        id: n.id,
        fileId: n.fileId,
        mine: n.mine,
        who: n.mine ? '我' : 'TA',
        date: this.fmtDate(n.createdAt),
        tilt: TILTS[i % TILTS.length]
      }))
      this.setData({
        loading: false,
        refreshing: false,
        total: items.length,
        leftCol: items.filter((item, i) => i % 2 === 0),
        rightCol: items.filter((item, i) => i % 2 === 1)
      })
    } catch (err) {
      this.setData({ loading: false, refreshing: false })
      ui.showError(this, err)
    }
  },

  fmtDate(iso) {
    if (!iso) {
      return ''
    }
    const d = new Date(iso)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  },

  onWrite() {
    wx.navigateTo({ url: '/pages/write/write' })
  },

  // 点自己的纸条进入二次编辑
  onTapNote(e) {
    const { id, mine, fileid } = e.currentTarget.dataset
    if (!mine) {
      ui.toast(this, 'TA 写的纸条只能看不能改哦')
      return
    }
    wx.navigateTo({
      url: `/pages/write/write?noteId=${id}&fileId=${encodeURIComponent(fileid)}`
    })
  },

  // 长按自己写的纸条可以揭下
  onLongPress(e) {
    const { id, mine } = e.currentTarget.dataset
    if (!mine) {
      ui.toast(this, '这是 TA 写的纸条，揭不得哦')
      return
    }
    wx.showModal({
      title: '揭下这张纸条？',
      content: '揭下之后就找不回来了',
      confirmText: '揭下',
      cancelText: '留着',
      success: async (res) => {
        if (!res.confirm) {
          return
        }
        try {
          await api.call('note.remove', { noteId: id })
          ui.toast(this, '已揭下')
          this.loadNotes()
        } catch (err) {
          ui.showError(this, err)
        }
      }
    })
  }
})
