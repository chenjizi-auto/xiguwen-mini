const network = require('../../../api/network.js')

function asNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

function mapItem(item = {}) {
  const province = safeStr(item.province)
  const city = safeStr(item.city)
  return {
    id: asNumber(item.id, 0),
    province,
    city,
    cityText: city.replace(/[【】]/g, '') || '--',
    areaText: [province, city.replace(/[【】]/g, '')].filter(Boolean).join(' · ') || '--',
    weightText: `排序 ${asNumber(item.weight, 0)}`,
    raw: item
  }
}

Page({
  data: {
    list: [],
    page: 1,
    rows: 15,
    loading: false,
    finished: false,
    errorText: '',
    showAddPopup: false,
    submitLoading: false,
    form: {
      province: '',
      city: ''
    }
  },

  onLoad() {
    this.fetchList(true)
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
      const res = await network.xgwServiceCityList({
        p: nextPage,
        rows: this.data.rows
      })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.msg || res.message)) || '加载失败')
      }
      const source = Array.isArray(res.data) ? res.data : []
      const list = source.map(mapItem)
      this.setData({
        list: reset ? list : (this.data.list || []).concat(list),
        page: nextPage + 1,
        finished: list.length < this.data.rows,
        loading: false,
        errorText: ''
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '服务城市加载失败'
      })
      if (reset) {
        this.setData({ list: [] })
      }
    }
  },

  openAddPopup() {
    this.setData({
      showAddPopup: true,
      form: {
        province: '',
        city: ''
      }
    })
  },

  closeAddPopup() {
    if (this.data.submitLoading) return
    this.setData({ showAddPopup: false })
  },

  onProvinceInput(e) {
    this.setData({
      'form.province': safeStr(e && e.detail ? e.detail.value : '')
    })
  },

  onCityInput(e) {
    this.setData({
      'form.city': safeStr(e && e.detail ? e.detail.value : '')
    })
  },

  async submitAdd() {
    if (this.data.submitLoading) return
    const province = safeStr(this.data.form.province).trim()
    const city = safeStr(this.data.form.city).trim()
    if (!province) {
      wx.showToast({ title: '请输入省份名称', icon: 'none' })
      return
    }
    if (!city) {
      wx.showToast({ title: '请输入城市名称', icon: 'none' })
      return
    }
    this.setData({ submitLoading: true })
    try {
      const res = await network.xgwServiceCityAdd({ province, city })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.msg || res.message)) || '添加失败')
      }
      wx.showToast({ title: '添加成功', icon: 'success' })
      this.setData({
        submitLoading: false,
        showAddPopup: false
      })
      this.fetchList(true)
    } catch (err) {
      this.setData({ submitLoading: false })
      wx.showToast({
        title: err && err.message ? err.message : '添加失败',
        icon: 'none'
      })
    }
  },

  onDeleteTap(e) {
    const id = asNumber(e && e.currentTarget ? e.currentTarget.dataset.id : 0, 0)
    if (!id) return
    wx.showModal({
      title: '删除服务城市',
      content: '确认删除该服务城市吗？',
      success: res => {
        if (!res.confirm) return
        this.deleteItem(id)
      }
    })
  },

  async deleteItem(id) {
    wx.showLoading({ title: '删除中...' })
    try {
      const res = await network.xgwServiceCityDelete({ id })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.msg || res.message)) || '删除失败')
      }
      wx.hideLoading()
      wx.showToast({ title: '删除成功', icon: 'success' })
      this.setData({
        list: (this.data.list || []).filter(item => item.id !== id)
      })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err && err.message ? err.message : '删除失败',
        icon: 'none'
      })
    }
  }
})
