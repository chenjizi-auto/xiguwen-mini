function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

Page({
  data: {
    id: 0,
    title: '',
    content: ''
  },

  onLoad(options) {
    const raw = safeText(options && options.data)
    let parsed = null
    if (raw) {
      try {
        parsed = JSON.parse(decodeURIComponent(raw))
      } catch (err) {
        parsed = null
      }
    }
    const title = safeText(parsed && parsed.title, '婚礼宝典详情')
    this.setData({
      id: parsed && parsed.id ? parsed.id : 0,
      title,
      content: safeText(parsed && parsed.content)
    })
    wx.setNavigationBarTitle({
      title: '婚礼宝典详情'
    })
    wx.showShareMenu({
      menus: ['shareAppMessage']
    })
  },

  onShareAppMessage() {
    return {
      title: this.data.title || '婚礼宝典',
      path: `/pages/speech/detail?data=${encodeURIComponent(JSON.stringify(this.data))}`
    }
  }
})
