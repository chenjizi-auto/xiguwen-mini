const network = require('../../api/network.js')

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function getErrorMessage(res, fallback = '保存失败，请稍后重试') {
  if (!res) return fallback
  return res.message || res.msg || fallback
}

Page({
  data: {
    id: 0,
    title: '',
    content: '',
    saving: false
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
    const id = asNumber(parsed && parsed.id, 0)
    wx.setNavigationBarTitle({
      title: id ? '编辑宝典' : '新增宝典'
    })
    if (parsed) {
      this.setData({
        id,
        title: safeText(parsed.title),
        content: safeText(parsed.content)
      })
    }
  },

  onTitleInput(e) {
    this.setData({
      title: safeText(e.detail.value).slice(0, 18)
    })
  },

  onContentInput(e) {
    this.setData({
      content: safeText(e.detail.value).slice(0, 3000)
    })
  },

  async onSaveTap() {
    const title = this.data.title.trim()
    const content = this.data.content.trim()
    if (!title) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return
    }
    if (title.length > 9) {
      wx.showToast({ title: '标题最多9个汉字', icon: 'none' })
      return
    }
    if (!content) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }
    if (this.data.saving) return

    this.setData({ saving: true })
    wx.showLoading({
      title: '保存中...',
      mask: true
    })
    try {
      const payload = { title, content }
      const res = this.data.id
        ? await network.xgwSpeechEdit(Object.assign({ id: this.data.id }, payload))
        : await network.xgwSpeechAdd(payload)
      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res))
      }
      wx.showToast({
        title: this.data.id ? '修改成功' : '添加成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 300)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err && err.message ? err.message : '保存失败',
        icon: 'none'
      })
    } finally {
      this.setData({ saving: false })
    }
  }
})
