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
    time: '',
    person: '',
    matter: '',
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
      title: id ? '编辑流程' : '新增流程'
    })
    if (parsed) {
      this.setData({
        id,
        title: safeText(parsed.title),
        time: safeText(parsed.time),
        person: safeText(parsed.person),
        matter: safeText(parsed.matter)
      })
    }
  },

  onTitleInput(e) {
    this.setData({ title: safeText(e.detail.value).slice(0, 24) })
  },

  onPersonInput(e) {
    this.setData({ person: safeText(e.detail.value).slice(0, 60) })
  },

  onMatterInput(e) {
    this.setData({ matter: safeText(e.detail.value).slice(0, 300) })
  },

  onTimeChange(e) {
    this.setData({ time: safeText(e.detail.value) })
  },

  async onSaveTap() {
    const title = this.data.title.trim()
    const time = this.data.time.trim()
    const person = this.data.person.trim()
    const matter = this.data.matter.trim()

    if (!title) {
      wx.showToast({ title: '请输入流程类型', icon: 'none' })
      return
    }
    if (title.length > 12) {
      wx.showToast({ title: '流程类型最多12个汉字', icon: 'none' })
      return
    }
    if (!time) {
      wx.showToast({ title: '请选择时间', icon: 'none' })
      return
    }
    if (this.data.saving) return

    this.setData({ saving: true })
    wx.showLoading({
      title: '保存中...',
      mask: true
    })
    try {
      const payload = {
        title,
        renyuan: person,
        shijian: time,
        shixiang: matter
      }
      const res = this.data.id
        ? await network.xgwWeddingFlowEdit(Object.assign({ id: this.data.id }, payload))
        : await network.xgwWeddingFlowAdd(payload)
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
