const network = require('../../../../api/network.js')

const EDIT_CACHE_KEY = 'xgwNeedEditDraft'

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function normalizePrice(value) {
  const raw = safeText(value).replace(/[^\d.]/g, '')
  const firstDot = raw.indexOf('.')
  if (firstDot < 0) return raw.slice(0, 8)
  return (
    raw.slice(0, firstDot + 1) +
    raw
      .slice(firstDot + 1)
      .replace(/\./g, '')
      .slice(0, 2)
  ).slice(0, 10)
}

function getErrorMessage(res, fallback = '提交失败，请稍后重试') {
  if (!res) return fallback
  return res.message || res.msg || fallback
}

Page({
  data: {
    id: 0,
    isEdit: false,
    pageTitle: '发布需求',
    submitting: false,
    type: 1,
    typeText: '婚庆',
    title: '',
    price: '',
    region: [],
    regionText: '',
    details: '',
    openPhone: true,
    openMessage: true
  },

  onLoad(options) {
    const id = asNumber(options && options.id, 0)
    const isEdit = !!id
    const pageTitle = isEdit ? '编辑需求' : '发布需求'
    this.setData({
      id,
      isEdit,
      pageTitle
    })
    wx.setNavigationBarTitle({
      title: pageTitle
    })

    if (isEdit) {
      const draft = wx.getStorageSync(EDIT_CACHE_KEY) || null
      if (draft && asNumber(draft.id, 0) === id) {
        this.fillForm(draft)
        return
      }
      this.fetchDetail(id)
    }
  },

  onUnload() {
    if (!this.data.isEdit) return
    wx.removeStorageSync(EDIT_CACHE_KEY)
  },

  fillForm(data) {
    const type = asNumber(data.type, safeText(data.type).includes('商城') ? 2 : 1)
    const province = safeText(data.provinceid)
    const city = safeText(data.cityid)
    const county = safeText(data.countyid)
    const region = [province, city, county].filter(Boolean)
    this.setData({
      type,
      typeText: type === 2 ? '商城' : '婚庆',
      title: safeText(data.title),
      price: safeText(data.price),
      region,
      regionText: region.join(''),
      details: safeText(data.details),
      openPhone: asNumber(data.openphone, 1) === 1,
      openMessage: asNumber(data.openmessage, 1) === 1
    })
  },

  async fetchDetail(id) {
    wx.showLoading({
      title: '加载中...',
      mask: true
    })
    try {
      const res = await network.xgwMyNeedDetail({ id })
      wx.hideLoading()
      if (!res || res.code !== 0 || !res.data || !res.data.xuquxiangqing) {
        wx.showToast({
          title: getErrorMessage(res, '获取详情失败'),
          icon: 'none'
        })
        return
      }
      this.fillForm(res.data.xuquxiangqing)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: '获取详情失败',
        icon: 'none'
      })
    }
  },

  onTitleInput(e) {
    this.setData({
      title: safeText(e.detail.value).slice(0, 30)
    })
  },

  onPriceInput(e) {
    this.setData({
      price: normalizePrice(e.detail.value)
    })
  },

  onRegionChange(e) {
    const region = Array.isArray(e.detail.value) ? e.detail.value : []
    this.setData({
      region,
      regionText: region.join('')
    })
  },

  onDetailsInput(e) {
    this.setData({
      details: safeText(e.detail.value).slice(0, 300)
    })
  },

  onPhoneSwitch(e) {
    this.setData({
      openPhone: !!e.detail
    })
  },

  onMessageSwitch(e) {
    this.setData({
      openMessage: !!e.detail
    })
  },

  validateForm() {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return false
    }
    if (!this.data.region.length || this.data.region.length < 3) {
      wx.showToast({ title: '请选择地区', icon: 'none' })
      return false
    }
    if (!this.data.price.trim()) {
      wx.showToast({ title: '请输入意向价格', icon: 'none' })
      return false
    }
    return true
  },

  async submit() {
    if (this.data.submitting || !this.validateForm()) {
      return
    }
    const region = this.data.region || []
    const payload = {
      type: this.data.type,
      title: this.data.title.trim(),
      price: this.data.price.trim(),
      details: this.data.details.trim(),
      provinceid: region[0] || '',
      cityid: region[1] || '',
      countyid: region[2] || '',
      address: region.join('-'),
      openmessage: this.data.openMessage ? 1 : 0,
      openphone: this.data.openPhone ? 1 : 0
    }

    this.setData({ submitting: true })
    wx.showLoading({
      title: this.data.isEdit ? '修改中...' : '发布中...',
      mask: true
    })

    try {
      const res = this.data.isEdit
        ? await network.xgwEditNeed(Object.assign({ id: this.data.id }, payload))
        : await network.xgwAddNeed(payload)
      wx.hideLoading()
      if (!res || res.code !== 0) {
        wx.showToast({
          title: getErrorMessage(res),
          icon: 'none'
        })
        return
      }
      wx.setStorageSync('xgwNeedListShouldRefresh', true)
      wx.showToast({
        title: this.data.isEdit ? '修改成功' : '发布成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 300)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err && err.message ? err.message : '提交失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
