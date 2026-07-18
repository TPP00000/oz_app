// components/paper-toast/paper-toast.js - 纸片风格提示条（替代默认黑色 toast）
Component({
  data: {
    visible: false,
    message: ''
  },

  lifetimes: {
    detached() {
      if (this.hideTimer) {
        clearTimeout(this.hideTimer)
      }
    }
  },

  methods: {
    /**
     * 显示提示
     * @param {string} message 文案
     * @param {number} [duration] 展示时长 ms，默认 2200
     */
    show(message, duration) {
      if (this.hideTimer) {
        clearTimeout(this.hideTimer)
      }
      this.setData({ visible: true, message })
      this.hideTimer = setTimeout(() => {
        this.setData({ visible: false })
      }, duration || 2200)
    }
  }
})
