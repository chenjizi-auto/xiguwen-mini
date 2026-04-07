const network = require('../../../../api/network.js')

function asNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

Page({
  data: {
    detail: null,
    deleting: false
  },

  onLoad(options) {
    const raw = safeStr(options && options.data)
    if (!raw) return
    try {
      const detail = JSON.parse(decodeURIComponent(raw))
      this.setData({ detail })
    } catch (err) {}
  },

  goEdit() {
    const detail = this.data.detail
    if (!detail || asNumber(detail.xitong, 0) === 1) return
    wx.redirectTo({
      url: `/pages/my/schedule/form/index?data=${encodeURIComponent(JSON.stringify(detail))}`
    })
  },

  async onDelete() {
    const detail = this.data.detail
    if (!detail || this.data.deleting || asNumber(detail.xitong, 0) === 1) return
    const ok = await new Promise(resolve => {
      wx.showModal({
        title: '删除档期',
        content: '是否确认删除该档期？',
        confirmColor: '#e64340',
        success: res => resolve(!!res.confirm),
        fail: () => resolve(false)
      })
    })
    if (!ok) return
    this.setData({ deleting: true })
    wx.showLoading({ title: '删除中...', mask: true })
    try {
      const res = await network.xgwGradeDelete({ id: detail.id })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error((res && (res.msg || res.message)) || '删除失败')
      }
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 300)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: safeStr(err && err.message, '删除失败'),
        icon: 'none'
      })
    } finally {
      this.setData({ deleting: false })
    }
  }
})
