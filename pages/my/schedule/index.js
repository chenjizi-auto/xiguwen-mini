const network = require('../../../api/network.js')

function asNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

function normalizeMonth(item = {}) {
  const source = Array.isArray(item[0]) ? item[0] : Array.isArray(item.a) ? item.a : []
  return {
    month: safeStr(item.dateye, ''),
    count: asNumber(item.danshu, 0),
    list: source.map(grade => ({
      id: asNumber(grade.id, 0),
      date: safeStr(grade.date),
      timeslot: safeStr(grade.timeslot),
      contacts: safeStr(grade.contacts),
      contactnumber: safeStr(grade.contactnumber),
      remarks: safeStr(grade.remarks),
      tixing: Array.isArray(grade.tixing) ? grade.tixing : [],
      xitong: asNumber(grade.xitong, 0),
      raw: grade
    }))
  }
}

Page({
  data: {
    loading: true,
    errorText: '',
    page: 1,
    rows: 20,
    finished: false,
    sections: []
  },

  onLoad() {
    this.fetchList(true)
  },

  onShow() {
    if (this._refreshOnShow) {
      this._refreshOnShow = false
      this.fetchList(true)
    }
  },

  onPullDownRefresh() {
    this.fetchList(true).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.loading || this.data.finished) return
    this.fetchList(false)
  },

  async fetchList(reset = false) {
    if (this.data.loading) return
    const nextPage = reset ? 1 : this.data.page
    this.setData({
      loading: true,
      errorText: reset ? '' : this.data.errorText
    })
    try {
      const res = await network.xgwGradeList({
        p: nextPage,
        rows: this.data.rows
      })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.msg || res.message)) || '加载失败')
      }
      const source = Array.isArray(res.data) ? res.data : []
      const sections = source.map(normalizeMonth)
      this.setData({
        sections: reset ? sections : (this.data.sections || []).concat(sections),
        page: nextPage + 1,
        finished: sections.length < this.data.rows,
        loading: false,
        errorText: ''
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: '档期列表加载失败，请稍后重试'
      })
      if (reset) {
        this.setData({ sections: [] })
      }
    }
  },

  goAdd() {
    this._refreshOnShow = true
    wx.navigateTo({
      url: '/pages/my/schedule/form/index'
    })
  },

  onCardTap(e) {
    const sectionIndex = asNumber(e && e.currentTarget ? e.currentTarget.dataset.sectionIndex : -1, -1)
    const itemIndex = asNumber(e && e.currentTarget ? e.currentTarget.dataset.itemIndex : -1, -1)
    const section = (this.data.sections || [])[sectionIndex]
    const item = section && Array.isArray(section.list) ? section.list[itemIndex] : null
    if (!item || !item.id) return
    this._refreshOnShow = true
    wx.navigateTo({
      url: `/pages/my/schedule/detail/index?data=${encodeURIComponent(JSON.stringify(item.raw || item))}`
    })
  }
})
