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

function toTimestamp(dateText) {
  return Math.floor(new Date(dateText.replace(' ', 'T')).getTime() / 1000)
}

function formatDateTime(timestamp) {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || ts <= 0) return ''
  const date = new Date(ts * 1000)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

Page({
  data: {
    id: 0,
    template: null,
    bridegroom: '',
    bride: '',
    time: '',
    hotel: '',
    address: '',
    saving: false
  },

  onLoad(options) {
    let template = null
    let parsed = null
    const raw = safeText(options && options.template)
    const rawData = safeText(options && options.data)
    if (raw) {
      try {
        template = JSON.parse(decodeURIComponent(raw))
      } catch (err) {
        template = null
      }
    }
    if (rawData) {
      try {
        parsed = JSON.parse(decodeURIComponent(rawData))
      } catch (err) {
        parsed = null
      }
    }
    const now = new Date()
    const defaultTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} 12:00`
    const id = asNumber(parsed && parsed.id, 0)
    this.setData({
      id,
      template: template || (parsed ? {
        id: asNumber(parsed.mobanId, 0),
        cover: safeText(parsed.cover),
        title: safeText(parsed.title)
      } : null),
      bridegroom: safeText(parsed && parsed.bridegroom),
      bride: safeText(parsed && parsed.bride),
      time: formatDateTime(parsed && parsed.weddingTimestamp) || defaultTime,
      hotel: safeText(parsed && parsed.hotel),
      address: safeText(parsed && parsed.address)
    })
    wx.setNavigationBarTitle({ title: id ? '编辑请柬信息' : '请柬信息' })
    if (id && (!this.data.bridegroom || !this.data.bride || !this.data.address)) {
      this.fetchDetail(id)
    }
  },

  async fetchDetail(id) {
    try {
      const res = await network.xgwInvitationDetail({ id })
      const data = res && res.data ? res.data : null
      if (!res || res.code !== 0 || !data) return
      this.setData({
        bridegroom: safeText(data.xinlang, this.data.bridegroom),
        bride: safeText(data.xinniang, this.data.bride),
        time: formatDateTime(data.hunlitime) || this.data.time,
        hotel: safeText(data.hotel, this.data.hotel),
        address: safeText(data.hunlidizhi, this.data.address),
        template: this.data.template || {
          id: asNumber(data.umid, 0),
          title: safeText(data.title),
          cover: safeText(this.data.template && this.data.template.cover)
        }
      })
    } catch (err) {}
  },

  onInput(e) {
    const key = safeText(e.currentTarget.dataset.key)
    if (!key) return
    this.setData({
      [key]: safeText(e.detail.value)
    })
  },

  onDateTimeChange(e) {
    const date = safeText(e.detail.value)
    const currentTime = this.data.time.split(' ')[1] || '12:00'
    this.setData({ time: `${date} ${currentTime}` })
  },

  onTimeChange(e) {
    const time = safeText(e.detail.value)
    const currentDate = this.data.time.split(' ')[0]
    this.setData({ time: `${currentDate} ${time}` })
  },

  async onSaveTap() {
    const invitationId = asNumber(this.data.id, 0)
    const templateId = asNumber(this.data.template && this.data.template.id, 0)
    if (!invitationId && !templateId) {
      wx.showToast({ title: '模板信息缺失', icon: 'none' })
      return
    }
    if (!this.data.time.trim()) {
      wx.showToast({ title: '请选择婚礼时间', icon: 'none' })
      return
    }
    if (!this.data.bridegroom.trim()) {
      wx.showToast({ title: '请输入新郎姓名', icon: 'none' })
      return
    }
    if (!this.data.bride.trim()) {
      wx.showToast({ title: '请输入新娘姓名', icon: 'none' })
      return
    }
    if (!this.data.address.trim()) {
      wx.showToast({ title: '请输入婚礼地址', icon: 'none' })
      return
    }
    if (this.data.saving) return

    this.setData({ saving: true })
    wx.showLoading({ title: '提交中...', mask: true })
    try {
      const payload = {
        xinlang: this.data.bridegroom.trim(),
        xinniang: this.data.bride.trim(),
        hunlitime: toTimestamp(this.data.time),
        hotel: this.data.hotel.trim(),
        hunlidizhi: this.data.address.trim()
      }
      const res = invitationId
        ? await network.xgwInvitationEdit(Object.assign({ id: invitationId }, payload))
        : await network.xgwInvitationCreate(Object.assign({ id: templateId }, payload))
      wx.hideLoading()
      const previewUrl = safeText(res && (res.url || (res.data && res.data.url) || res.data))
      const nextInvitationId = invitationId || asNumber(res && (res.mid || (res.data && res.data.mid)), 0)
      const ok = res && (res.code === 0 || nextInvitationId || previewUrl)
      if (!ok) {
        throw new Error(getErrorMessage(res))
      }
      wx.showToast({ title: invitationId ? '修改成功' : '创建成功', icon: 'success' })
      const title = `${this.data.bridegroom.trim()}&${this.data.bride.trim()}的婚礼请柬`
      const summary = {
        id: nextInvitationId,
        mobanId: templateId,
        cover: safeText(this.data.template && this.data.template.cover),
        shareUrl: previewUrl,
        url: previewUrl,
        title,
        bridegroom: this.data.bridegroom.trim(),
        bride: this.data.bride.trim(),
        hotel: this.data.hotel.trim(),
        address: this.data.address.trim(),
        weddingTimestamp: toTimestamp(this.data.time)
      }
      setTimeout(() => {
        const targetUrl =
          `/pages/invitation/preview?id=${nextInvitationId}` +
          `&title=${encodeURIComponent(title)}` +
          `&cover=${encodeURIComponent((this.data.template && this.data.template.cover) || '')}` +
          `&url=${encodeURIComponent(previewUrl)}` +
          `&data=${encodeURIComponent(JSON.stringify(summary))}`
        if (invitationId) {
          wx.redirectTo({ url: targetUrl })
        } else {
          wx.redirectTo({ url: targetUrl })
        }
      }, 300)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: err && err.message ? err.message : '保存失败', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  }
})
