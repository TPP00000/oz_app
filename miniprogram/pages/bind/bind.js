// pages/bind/bind.js - 情侣绑定页
const api = require('../../utils/api')
const ui = require('../../utils/ui')

const app = getApp()

Page({
  data: {
    inviteCode: '',
    inputCode: '',
    creating: false,
    binding: false,
    checking: false,
    safeTop: 20
  },

  onLoad() {
    this.setData({ safeTop: ui.safeTop() })
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
      ui.showError(this, err)
    } finally {
      this.setData({ creating: false })
    }
  },

  onCopyCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => {
        ui.toast(this, '已复制，发给 TA 吧')
      }
    })
  },

  onInputCode(e) {
    this.setData({ inputCode: e.detail.value })
  },

  handleBindSuccess(couple) {
    app.globalData.couple = couple
    ui.toast(this, '绑定成功！两个人的小屋开张啦')
    setTimeout(() => {
      wx.redirectTo({ url: '/pages/index/index' })
    }, 1200)
  },

  async onBind() {
    const code = this.data.inputCode.trim().toUpperCase()
    if (!code) {
      ui.toast(this, '请先输入邀请码')
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
      ui.showError(this, err)
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
        ui.toast(this, 'TA 还没输入邀请码哦')
      }
    } catch (err) {
      ui.showError(this, err)
    } finally {
      this.setData({ checking: false })
    }
  }
})
