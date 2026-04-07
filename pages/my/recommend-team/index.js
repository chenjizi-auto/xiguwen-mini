const network = require('../../../api/network.js')

function asNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

function formatTime(value) {
  const text = safeStr(value)
  if (!text) return '--'
  if (/^\d+$/.test(text)) {
    const num = Number(text)
    const ms = text.length === 10 ? num * 1000 : num
    const date = new Date(ms)
    if (!Number.isNaN(date.getTime())) {
      const y = date.getFullYear()
      const m = `${date.getMonth() + 1}`.padStart(2, '0')
      const d = `${date.getDate()}`.padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }
  return text
}

function mapItem(item = {}) {
  return {
    id: asNumber(item.id, 0),
    nickname: safeStr(item.nickname, '店铺名称未填写'),
    shopcode: safeStr(item.shopcode, '--'),
    weight: safeStr(item.weight, '0'),
    timeText: formatTime(item.update_ti || item.create_ti),
    raw: item
  }
}

Page({
  data: {
    list: [],
    loading: false,
    errorText: '',
    showAddPopup: false,
    submitLoading: false,
    form: {
      shopcode: '',
      weight: ''
    }
  },

  onLoad() {
    this.fetchList()
  },

  onPullDownRefresh() {
    this.fetchList().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  async fetchList() {
    if (this.data.loading) return
    this.setData({
      loading: true,
      errorText: ''
    })
    try {
      const res = await network.xgwRecommendTeamList({})
      if (!res || res.code !== 0) {
        throw new Error((res && (res.msg || res.message)) || '加载失败')
      }
      const source = Array.isArray(res.data) ? res.data : []
      this.setData({
        list: source.map(mapItem),
        loading: false,
        errorText: ''
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '推荐团队加载失败',
        list: []
      })
    }
  },

  openAddPopup() {
    this.setData({
      showAddPopup: true,
      form: {
        shopcode: '',
        weight: ''
      }
    })
  },

  closeAddPopup() {
    if (this.data.submitLoading) return
    this.setData({ showAddPopup: false })
  },

  onShopcodeInput(e) {
    this.setData({
      'form.shopcode': safeStr(e && e.detail ? e.detail.value : '')
    })
  },

  onWeightInput(e) {
    this.setData({
      'form.weight': safeStr(e && e.detail ? e.detail.value : '')
    })
  },

  async submitAdd() {
    if (this.data.submitLoading) return
    const shopcode = safeStr(this.data.form.shopcode).trim()
    const weight = safeStr(this.data.form.weight).trim()
    if (!shopcode) {
      wx.showToast({ title: '请输入店铺编号', icon: 'none' })
      return
    }
    if (!weight) {
      wx.showToast({ title: '请输入排序值', icon: 'none' })
      return
    }
    if (Number.isNaN(Number(weight))) {
      wx.showToast({ title: '排序格式有误', icon: 'none' })
      return
    }
    this.setData({ submitLoading: true })
    try {
      const res = await network.xgwRecommendTeamAdd({ shopcode, weight })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.msg || res.message)) || '添加失败')
      }
      wx.showToast({ title: '添加成功', icon: 'success' })
      this.setData({
        submitLoading: false,
        showAddPopup: false
      })
      this.fetchList()
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
      title: '删除推荐团队',
      content: '确认删除该推荐团队吗？',
      success: res => {
        if (!res.confirm) return
        this.deleteItem(id)
      }
    })
  },

  async deleteItem(id) {
    wx.showLoading({ title: '删除中...' })
    try {
      const res = await network.xgwRecommendTeamDelete({ id })
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
