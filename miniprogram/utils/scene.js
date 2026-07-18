// utils/scene.js - 全屏横向场景页（卧室/厨房）共用逻辑
// 场景图统一为 1536x1024：高度撑满屏幕，宽度按比例展开，横向可滑动

const SCENE_RATIO = 1536 / 1024

/**
 * 计算场景铺满布局
 * @param {number} focusX 初始视野中心在场景图上的横向位置（0~1）
 * @returns {{ panoWidth: number, panoHeight: number, scrollLeft: number }}
 */
function sceneLayout(focusX) {
  const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
  const panoHeight = win.windowHeight
  const panoWidth = Math.round(panoHeight * SCENE_RATIO)
  return {
    panoWidth,
    panoHeight,
    scrollLeft: Math.max(0, Math.round(panoWidth * focusX - win.windowWidth / 2))
  }
}

// 点门回客厅：正常从客厅进来则返回上一页；异常栈底时兜底重开主页
function backToLiving() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    wx.navigateBack()
  } else {
    wx.reLaunch({ url: '/pages/index/index' })
  }
}

module.exports = { sceneLayout, backToLiving }
