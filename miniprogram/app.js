// app.js
const { CLOUD_ENV } = require('./config')
const fontData = require('./utils/font-data')

App({
  globalData: {
    openid: '',
    couple: null
  },

  onLaunch() {
    this.loadUiFont()

    if (!wx.cloud) {
      wx.showModal({
        title: '提示',
        content: '当前微信版本过低，无法使用云能力，请升级微信后重试',
        showCancel: false
      })
      return
    }
    wx.cloud.init({
      env: CLOUD_ENV,
      traceUser: true
    })
  },

  // 加载像素风界面字体（含常用汉字全集的 woff2 子集）；失败时自动回退系统字体
  loadUiFont() {
    wx.loadFontFace({
      global: true,
      family: 'FusionPixel',
      source: `url(data:font/woff2;base64,${fontData})`,
      scopes: ['webview'],
      fail: () => {}
    })
  }
})
