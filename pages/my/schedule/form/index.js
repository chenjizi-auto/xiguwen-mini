const network = require('../../../../api/network.js')

const TIMESLOT_OPTIONS = [
  { label: '上午', value: 1 },
  { label: '中午', value: 2 },
  { label: '下午', value: 3 },
  { label: '晚上', value: 4 },
  { label: '全天', value: 5 },
  { label: '不接单', value: 6 }
]

function asNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

function today() {
  const date = new Date()
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

Page({
  data: {
    saving: false,
    isEdit: false,
    id: 0,
    date: today(),
    timeslotIndex: 1,
    contacts: '',
    contactnumber: '',
    remarks: '',
    timeslotOptions: TIMESLOT_OPTIONS
  },

  onLoad(options) {
    const raw = safeStr(options && options.data)
    if (!raw) return
    try {
      const data = JSON.parse(decodeURIComponent(raw))
      const timeslotIndex = Math.max(
        TIMESLOT_OPTIONS.findIndex(item => safeStr(item.label) === safeStr(data.timeslot)),
        0
      )
      this.setData({
        isEdit: true,
        id: asNumber(data.id, 0),
        date: safeStr(data.date, today()),
        timeslotIndex,
        contacts: safeStr(data.contacts),
        contactnumber: safeStr(data.contactnumber),
        remarks: safeStr(data.remarks)
      })
      wx.setNavigationBarTitle({
        title: '编辑档期'
      })
    } catch (err) {}
  },

  onDateChange(e) {
    this.setData({ date: safeStr(e && e.detail ? e.detail.value : today()) })
  },

  onTimeslotChange(e) {
    this.setData({ timeslotIndex: asNumber(e && e.detail ? e.detail.value : 0, 0) })
  },

  onInput(e) {
    const key = safeStr(e && e.currentTarget ? e.currentTarget.dataset.key : '')
    if (!key) return
    this.setData({
      [key]: safeStr(e && e.detail ? e.detail.value : '')
    })
  },

  async onSubmit() {
    if (this.data.saving) return
    this.setData({ saving: true })
    wx.showLoading({ title: '保存中...', mask: true })
    try {
      const currentSlot = TIMESLOT_OPTIONS[this.data.timeslotIndex] || TIMESLOT_OPTIONS[0]
      const payload = {
        contactnumber: safeStr(this.data.contactnumber).trim(),
        contacts: safeStr(this.data.contacts).trim(),
        date: safeStr(this.data.date),
        remarks: safeStr(this.data.remarks).trim(),
        timeslot: currentSlot.value,
        tixing: '[]'
      }
      const request = this.data.isEdit ? network.xgwGradeUpdate : network.xgwGradeAdd
      if (this.data.isEdit) {
        payload.id = this.data.id
      }
      const res = await request(payload)
      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error((res && (res.msg || res.message)) || '保存失败')
      }
      wx.showToast({
        title: this.data.isEdit ? '修改成功' : '添加成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 300)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: safeStr(err && err.message, '保存失败'),
        icon: 'none'
      })
    } finally {
      this.setData({ saving: false })
    }
  }
})
