// components/nav-back/nav-back.js - 纸片风返回按钮（配合自定义导航使用）
Component({
  data: {
    top: 28
  },

  lifetimes: {
    attached() {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      this.setData({ top: (win.statusBarHeight || 20) + 8 })
    }
  },

  methods: {
    onBack() {
      wx.navigateBack()
    }
  }
})
