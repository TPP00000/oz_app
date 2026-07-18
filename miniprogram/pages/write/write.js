// pages/write/write.js - 手写画板（写给 TA 的纸条，支持二次编辑）
const api = require('../../utils/api')
const ui = require('../../utils/ui')

const app = getApp()

const PENS = [
  { key: 'ink', color: '#6b4a32' },
  { key: 'rose', color: '#c25e75' },
  { key: 'purple', color: '#8b6bb8' },
  { key: 'green', color: '#6e8a4e' },
  { key: 'gold', color: '#d99a2b' },
  { key: 'blue', color: '#5a96c8' }
]
const STROKE_WIDTH = 4
const ERASER_WIDTH = 22

Page({
  data: {
    safeTop: 20,
    pens: PENS,
    activePen: 'ink',
    eraser: false,
    saving: false,
    strokeCount: 0,
    editing: false
  },

  onLoad(options) {
    this.setData({ safeTop: ui.safeTop() })
    this.strokes = []
    this.current = null
    this.baseImg = null
    this.noteId = (options && options.noteId) || ''
    this.baseFileId = options && options.fileId ? decodeURIComponent(options.fileId) : ''
    if (this.noteId) {
      this.setData({ editing: true })
    }
  },

  onReady() {
    wx.createSelectorQuery()
      .in(this)
      .select('#board')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) {
          return
        }
        const { node, width, height } = res[0]
        const dpr = wx.getWindowInfo
          ? wx.getWindowInfo().pixelRatio
          : wx.getSystemInfoSync().pixelRatio
        node.width = width * dpr
        node.height = height * dpr
        const ctx = node.getContext('2d')
        ctx.scale(dpr, dpr)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        this.canvas = node
        this.ctx = ctx
        this.boardW = width
        this.boardH = height
        if (this.baseFileId) {
          this.loadBase()
        }
      })
  },

  // 二次编辑：把旧笔迹铺回画布作为底
  async loadBase() {
    try {
      const res = await wx.cloud.downloadFile({ fileID: this.baseFileId })
      const img = this.canvas.createImage()
      img.onload = () => {
        this.baseImg = img
        this.redraw()
        this.setData({ strokeCount: 1 })
      }
      img.src = res.tempFilePath
    } catch (err) {
      ui.toast(this, '旧笔迹加载失败，可以直接重写')
    }
  },

  applyPen(c, stroke) {
    if (stroke.erase) {
      c.globalCompositeOperation = 'destination-out'
      c.strokeStyle = 'rgba(0,0,0,1)'
      c.fillStyle = 'rgba(0,0,0,1)'
    } else {
      c.globalCompositeOperation = 'source-over'
      c.strokeStyle = stroke.color
      c.fillStyle = stroke.color
    }
    c.lineWidth = stroke.width
  },

  penColor() {
    const pen = PENS.find((p) => p.key === this.data.activePen)
    return pen ? pen.color : PENS[0].color
  },

  onTouchStart(e) {
    if (!this.ctx) {
      return
    }
    const t = e.touches[0]
    this.current = {
      erase: this.data.eraser,
      color: this.penColor(),
      width: this.data.eraser ? ERASER_WIDTH : STROKE_WIDTH,
      points: [{ x: t.x, y: t.y }]
    }
  },

  onTouchMove(e) {
    if (!this.ctx || !this.current) {
      return
    }
    const t = e.touches[0]
    const pts = this.current.points
    const last = pts[pts.length - 1]
    pts.push({ x: t.x, y: t.y })
    const c = this.ctx
    this.applyPen(c, this.current)
    c.beginPath()
    c.moveTo(last.x, last.y)
    c.lineTo(t.x, t.y)
    c.stroke()
    c.globalCompositeOperation = 'source-over'
  },

  onTouchEnd() {
    if (!this.current) {
      return
    }
    if (this.current.points.length === 1) {
      const p = this.current.points[0]
      const c = this.ctx
      this.applyPen(c, this.current)
      c.beginPath()
      c.arc(p.x, p.y, this.current.width / 2, 0, Math.PI * 2)
      c.fill()
      c.globalCompositeOperation = 'source-over'
    }
    this.strokes.push(this.current)
    this.current = null
    this.setData({ strokeCount: this.strokes.length + (this.baseImg ? 1 : 0) })
  },

  redraw() {
    const c = this.ctx
    c.globalCompositeOperation = 'source-over'
    c.clearRect(0, 0, this.boardW, this.boardH)
    if (this.baseImg) {
      c.drawImage(this.baseImg, 0, 0, this.boardW, this.boardH)
    }
    for (const s of this.strokes) {
      this.applyPen(c, s)
      if (s.points.length === 1) {
        c.beginPath()
        c.arc(s.points[0].x, s.points[0].y, s.width / 2, 0, Math.PI * 2)
        c.fill()
        continue
      }
      c.beginPath()
      c.moveTo(s.points[0].x, s.points[0].y)
      for (let i = 1; i < s.points.length; i += 1) {
        c.lineTo(s.points[i].x, s.points[i].y)
      }
      c.stroke()
    }
    c.globalCompositeOperation = 'source-over'
  },

  onSelectPen(e) {
    this.setData({ activePen: e.currentTarget.dataset.pen, eraser: false })
  },

  onToggleEraser() {
    this.setData({ eraser: !this.data.eraser })
  },

  onUndo() {
    if (!this.strokes.length) {
      return
    }
    this.strokes.pop()
    this.redraw()
    this.setData({ strokeCount: this.strokes.length + (this.baseImg ? 1 : 0) })
  },

  onClear() {
    if (!this.strokes.length && !this.baseImg) {
      return
    }
    this.strokes = []
    this.baseImg = null
    this.redraw()
    this.setData({ strokeCount: 0 })
  },

  async onSave() {
    if (this.data.saving) {
      return
    }
    if (!this.strokes.length && !this.baseImg) {
      ui.toast(this, '先写点什么给 TA 吧')
      return
    }
    const couple = app.globalData.couple
    if (!couple) {
      ui.toast(this, '请先回到首页看看小屋哦')
      return
    }
    this.setData({ saving: true })
    try {
      const temp = await wx.canvasToTempFilePath({
        canvas: this.canvas,
        fileType: 'png'
      })
      const cloudPath = `notes/${couple.id}/${Date.now()}-${Math.floor(Math.random() * 10000)}.png`
      const upload = await wx.cloud.uploadFile({
        cloudPath,
        filePath: temp.tempFilePath
      })
      if (this.noteId) {
        await api.call('note.update', { noteId: this.noteId, fileId: upload.fileID })
        ui.toast(this, '改好啦 ✍️')
      } else {
        await api.call('note.create', { fileId: upload.fileID })
        ui.toast(this, '贴到留言板上啦 ✍️')
      }
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err) {
      ui.showError(this, err)
      this.setData({ saving: false })
    }
  }
})
