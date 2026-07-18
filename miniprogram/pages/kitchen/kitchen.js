// pages/kitchen/kitchen.js - 厨房（固定白天，拱形门洞回客厅）
const ui = require('../../utils/ui')
const scene = require('../../utils/scene')
const config = require('../../config')

// 拱形门洞热区（占场景图的百分比）：与主图开放式门洞风格一致
const DOOR_RECT = { left: 39.5, top: 15.5, width: 18, height: 76 }

// 门洞精灵（手动抠图流水线产出，掩码存 assets-src/masks/，坐标由 apply_mask.py 打印）
// 置 null 可退回柔光热区反馈
const DOOR_SPRITE = {
  rect: { left: 38.09, top: 14.36, width: 23.18, height: 69.92 },
  src: 'sp-kitchen-arch.png'
}

Page({
  data: {
    sceneSrc: config.ROOM_ASSET_PREFIX + 'room-kitchen.jpg',
    sceneLoaded: false,
    doorSprite: DOOR_SPRITE ? config.ROOM_ASSET_PREFIX + DOOR_SPRITE.src : '',
    doorRect: DOOR_SPRITE ? DOOR_SPRITE.rect : DOOR_RECT,
    panoWidth: 0,
    panoHeight: 0,
    scrollLeft: 0,
    chipTop: 40
  },

  onLoad() {
    this.setData({
      // 初始视野居中（门洞与餐桌都在视野内）
      ...scene.sceneLayout(0.5),
      chipTop: ui.safeTop() + 10
    })
  },

  onSceneLoad() {
    this.setData({ sceneLoaded: true })
  },

  onSceneError() {
    ui.toast(this, '厨房还没布置好，请稍后再来')
  },

  onTapDoor() {
    scene.backToLiving()
  }
})
