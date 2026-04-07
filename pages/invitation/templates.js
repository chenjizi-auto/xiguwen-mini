const network = require('../../api/network.js')

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function getErrorMessage(res, fallback = '加载失败，请稍后重试') {
  if (!res) return fallback
  return res.message || res.msg || fallback
}

function normalizeType(item) {
  return {
    id: asNumber(item && item.id, 0),
    title: safeText(item && item.title, '未命名分类')
  }
}

function normalizeTemplate(item) {
  return {
    id: asNumber(item && item.id, 0),
    title: safeText(item && item.title, '未命名模板'),
    cover: safeText(item && item.cover),
    url: safeText(item && item.url),
    isVip: asNumber(item && item.isvip, 0)
  }
}

Page({
  data: {
    loading: true,
    errorText: '',
    types: [],
    activeTypeId: 0,
    list: []
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '选择请柬模板' })
    this.fetchTypes()
  },

  async fetchTypes() {
    this.setData({ loading: true, errorText: '' })
    try {
      const res = await network.xgwInvitationTemplateTypes({})
      const types = (Array.isArray(res.data) ? res.data : []).map(normalizeType)
      if (!res || res.code !== 0 || types.length === 0) {
        throw new Error(getErrorMessage(res))
      }
      this.setData({
        types,
        activeTypeId: types[0].id
      })
      await this.fetchTemplates(types[0].id)
    } catch (err) {
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '加载失败，请稍后重试',
        types: [],
        list: []
      })
    }
  },

  async fetchTemplates(typeId) {
    this.setData({ loading: true, errorText: '' })
    try {
      const res = await network.xgwInvitationTemplates({
        leibieid: typeId,
        p: 1,
        rows: 100
      })
      const dataList = Array.isArray(res && res.data && res.data.data) ? res.data.data : []
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res))
      }
      this.setData({
        loading: false,
        activeTypeId: typeId,
        list: dataList.map(normalizeTemplate)
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '加载失败，请稍后重试',
        list: []
      })
    }
  },

  onTypeTap(e) {
    const typeId = asNumber(e.currentTarget.dataset.id, 0)
    if (!typeId || typeId === this.data.activeTypeId) return
    this.fetchTemplates(typeId)
  },

  onSelectTap(e) {
    const item = e.currentTarget.dataset.item
    if (!item || !item.id) return
    wx.navigateTo({
      url: `/pages/invitation/form?template=${encodeURIComponent(JSON.stringify(item))}`
    })
  }
})
