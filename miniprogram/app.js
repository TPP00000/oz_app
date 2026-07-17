// app.js
const { CLOUD_ENV } = require('./config')

App({
  globalData: {
    openid: '',
    couple: null
  },

  onLaunch() {
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
  }
})
