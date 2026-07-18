// utils/ui.js - 页面 UI 反馈（纸片风提示，找不到组件时退回系统 toast）

/**
 * 显示纸片提示；页面需在 wxml 中放置 <paper-toast id="toast" />
 * @param {WechatMiniprogram.Page.Instance} page 页面实例（传 this）
 * @param {string} message 文案
 */
function toast(page, message) {
  const comp = page && page.selectComponent && page.selectComponent('#toast')
  if (comp) {
    comp.show(message)
    return
  }
  wx.showToast({ title: message, icon: 'none', duration: 2200 })
}

/**
 * 显示错误提示
 * @param {WechatMiniprogram.Page.Instance} page 页面实例
 * @param {unknown} err
 */
function showError(page, err) {
  toast(page, (err && err.message) || '出错了，请稍后再试')
}

/**
 * 状态栏高度 px（自定义导航时页面内容需要避开）
 * @returns {number}
 */
function safeTop() {
  const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
  return win.statusBarHeight || 20
}

module.exports = { toast, showError, safeTop }
