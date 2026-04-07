const network = require('../../../api/network.js')

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

function compareTime(start, end) {
  const startParts = start.split(':').map(Number)
  const endParts = end.split(':').map(Number)
  const startValue = (startParts[0] || 0) * 60 + (startParts[1] || 0)
  const endValue = (endParts[0] || 0) * 60 + (endParts[1] || 0)
  return endValue - startValue
}

Page({
  data: {
    id: 0,
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    content: '',
    saving: false
  },

  onLoad(options) {
    const raw = safeText(options && options.data)
    const presetDate = safeText(options && options.date)
    let parsed = null
    if (raw) {
      try {
        parsed = JSON.parse(decodeURIComponent(raw))
      } catch (err) {
        parsed = null
      }
    }
    const today = new Date()
    const fallbackDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const id = asNumber(parsed && parsed.id, 0)
    wx.setNavigationBarTitle({
      title: id ? '编辑日程' : '新建日程'
    })
    this.setData({
      id,
      date: safeText(parsed && parsed.date, presetDate || fallbackDate),
      startTime: safeText(parsed && parsed.startTime, '09:00'),
      endTime: safeText(parsed && parsed.endTime, '10:00'),
      content: safeText(parsed && parsed.content)
    })
  },

  onDateChange(e) {
    this.setData({ date: safeText(e.detail.value) })
  },

  onStartTimeChange(e) {
    this.setData({ startTime: safeText(e.detail.value) })
  },

  onEndTimeChange(e) {
    this.setData({ endTime: safeText(e.detail.value) })
  },

  onContentInput(e) {
    this.setData({ content: safeText(e.detail.value).slice(0, 200) })
  },

  async onSaveTap() {
    const date = this.data.date.trim()
    const startTime = this.data.startTime.trim()
    const endTime = this.data.endTime.trim()
    const content = this.data.content.trim()

    if (!date) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    if (!startTime || !endTime) {
      wx.showToast({ title: '请选择时间', icon: 'none' })
      return
    }
    if (compareTime(startTime, endTime) <= 0) {
      wx.showToast({ title: '结束时间应大于开始时间', icon: 'none' })
      return
    }
    if (!content) {
      wx.showToast({ title: '请输入日程内容', icon: 'none' })
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
        conn: content,
        riqi: date,
        statime: startTime,
        endtime: endTime
      }
      const res = this.data.id
        ? await network.xgwScheduleEdit(Object.assign({ id: this.data.id }, payload))
        : await network.xgwScheduleAdd(payload)
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
