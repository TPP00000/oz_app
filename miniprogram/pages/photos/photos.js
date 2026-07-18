// pages/photos/photos.js - 照片墙（情侣日常的拍立得墙）
const api = require('../../utils/api')
const ui = require('../../utils/ui')

const app = getApp()

// 拍立得的随机倾斜角度（按位置循环，静态可预期）
const TILTS = [-2.2, 1.6, -1.2, 2.4, -1.8, 1.2]

Page({
  data: {
    loading: true,
    refreshing: false,
    uploading: false,
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
    this.loadPhotos()
  },

  async loadPhotos() {
    const firstLoad = !this.hasLoaded
    if (firstLoad) {
      this.setData({ loading: true })
    } else {
      this.setData({ refreshing: true })
    }
    try {
      const photos = await api.call('photo.list')
      this.hasLoaded = true
      this.allFileIds = photos.map((p) => p.fileId)
      const items = photos.map((p, i) => ({
        id: p.id,
        fileId: p.fileId,
        caption: p.caption,
        mine: p.mine,
        who: p.mine ? '我' : 'TA',
        date: this.fmtDate(p.createdAt),
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

  // 贴一张：选图 → 传云存储 → 写说明 → 落库
  async onAddPhoto() {
    if (this.data.uploading) {
      return
    }
    const couple = app.globalData.couple
    if (!couple) {
      ui.toast(this, '请先回到首页看看小屋哦')
      return
    }
    let media
    try {
      media = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
    } catch (err) {
      return // 用户取消选图
    }
    const filePath = media.tempFiles[0].tempFilePath

    this.setData({ uploading: true })
    try {
      const ext = filePath.split('.').pop() || 'jpg'
      const cloudPath = `photos/${couple.id}/${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`
      const upload = await wx.cloud.uploadFile({ cloudPath, filePath })

      const caption = await this.askCaption()
      await api.call('photo.create', { fileId: upload.fileID, caption })
      ui.toast(this, '贴好啦，TA 也能看到咯 📷')
      this.loadPhotos()
    } catch (err) {
      ui.showError(this, err)
    } finally {
      this.setData({ uploading: false })
    }
  },

  askCaption() {
    return new Promise((resolve) => {
      wx.showModal({
        title: '配一句话',
        editable: true,
        placeholderText: '比如：今天的晚饭（可不填）',
        confirmText: '贴上去',
        cancelText: '不写了',
        success: (res) => resolve(res.confirm ? res.content || '' : ''),
        fail: () => resolve('')
      })
    })
  },

  onPreview(e) {
    const fileId = e.currentTarget.dataset.fileid
    wx.previewImage({ current: fileId, urls: this.allFileIds })
  },

  // 长按自己贴的照片可以撕掉
  onLongPress(e) {
    const { id, mine } = e.currentTarget.dataset
    if (!mine) {
      ui.toast(this, '这是 TA 贴的照片，撕不得哦')
      return
    }
    wx.showModal({
      title: '撕掉这张照片？',
      content: '撕掉之后就找不回来了',
      confirmText: '撕掉',
      cancelText: '留着',
      success: async (res) => {
        if (!res.confirm) {
          return
        }
        try {
          await api.call('photo.remove', { photoId: id })
          ui.toast(this, '已撕掉')
          this.loadPhotos()
        } catch (err) {
          ui.showError(this, err)
        }
      }
    })
  }
})
