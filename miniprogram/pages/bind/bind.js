// pages/bind/bind.js - 情侣绑定页
const api = require('../../utils/api')

const app = getApp()

Page({
  data: {
    inviteCode: '',
    inputCode: '',
    creating: false,
    binding: false,
    checking: false
  },

  async onCreateInvite() {
    if (this.data.creating) {
      return
    }
    this.setData({ creating: true })
    try {
      const result = await api.call('couple.createInvite')
      this.setData({ inviteCode: result.inviteCode })
    } catch (err) {
      api.showError(err)
    } finally {
      this.setData({ creating: false })
    }
  },

  onCopyCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => {
        wx.showToast({ title: '已复制，发给 TA 吧', icon: 'none' })
      }
    })
  },

  onInputCode(e) {
    this.setData({ inputCode: e.detail.value })
  },

  handleBindSuccess(couple) {
    app.globalData.couple = couple
    wx.showToast({ title: '绑定成功 💕', icon: 'none' })
    setTimeout(() => {
      wx.redirectTo({ url: '/pages/index/index' })
    }, 1200)
  },

  async onBind() {
    const code = this.data.inputCode.trim().toUpperCase()
    if (!code) {
      wx.showToast({ title: '请先输入邀请码', icon: 'none' })
      return
    }
    if (this.data.binding) {
      return
    }
    this.setData({ binding: true })
    try {
      const result = await api.call('couple.bindWithCode', { inviteCode: code })
      this.handleBindSuccess(result.couple)
    } catch (err) {
      api.showError(err)
    } finally {
      this.setData({ binding: false })
    }
  },

  // 创建邀请码的一方，等对方绑定后手动刷新状态
  async onCheckBound() {
    if (this.data.checking) {
      return
    }
    this.setData({ checking: true })
    try {
      const result = await api.call('user.init')
      if (result.couple) {
        this.handleBindSuccess(result.couple)
      } else {
        wx.showToast({ title: 'TA 还没输入邀请码哦', icon: 'none' })
      }
    } catch (err) {
      api.showError(err)
    } finally {
      this.setData({ checking: false })
    }
  }
})
