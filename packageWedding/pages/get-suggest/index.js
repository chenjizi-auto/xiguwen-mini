const network = require('../../../api/network.js')

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function getNodeChildren(node, key) {
  return Array.isArray(node && node[key]) ? node[key] : []
}

function normalizeCountyNode(node) {
  return {
    id: safeText(node && node.id),
    name: safeText(node && node.name)
  }
}

function normalizeCityNode(node) {
  return {
    id: safeText(node && node.id),
    name: safeText(node && node.name),
    county: getNodeChildren(node, 'county').map(normalizeCountyNode)
  }
}

function normalizeProvinceNode(node) {
  return {
    id: safeText(node && node.id),
    name: safeText(node && node.name),
    city: getNodeChildren(node, 'city').map(normalizeCityNode)
  }
}

function extractRegionTree(res) {
  const data = res && res.data
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data && data.site)
      ? data.site
      : Array.isArray(data && data.list)
        ? data.list
        : []
  return list.map(normalizeProvinceNode)
}

function getToday() {
  const date = new Date()
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function sanitizePrice(value) {
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

Page({
  data: {
    countText: '0位',
    minDate: getToday(),
    dateValue: '',
    dateText: '',
    undetermined: true,
    price: '',
    regionText: '',
    mobile: '',
    remark: '',
    submitting: false,
    regionPopupVisible: false,
    provinces: [],
    cities: [],
    counties: [],
    pickerValue: [0, 0, 0],
    selectedProvinceId: '',
    selectedProvinceName: '',
    selectedCityId: '',
    selectedCountyId: ''
  },

  onLoad() {
    this.loadCount()
    this.loadRegions()
  },

  async loadCount() {
    try {
      const res = await network.xgwGetSuggestCount({})
      const num = safeText(res && res.data, '0')
      this.setData({
        countText: `${num}位`
      })
    } catch (err) {}
  },

  async loadRegions() {
    try {
      const res = await network.xgwRegionList({})
      const provinces = res && res.code === 0 ? extractRegionTree(res) : []
      const province = provinces[0] || null
      const cities = getNodeChildren(province, 'city')
      const city = cities[0] || null
      const counties = getNodeChildren(city, 'county')
      this.setData({
        provinces,
        cities,
        counties
      })
    } catch (err) {
      this.setData({
        provinces: [],
        cities: [],
        counties: []
      })
    }
  },

  onDateChange(e) {
    const value = safeText(e && e.detail && e.detail.value)
    if (!value) return
    this.setData({
      dateValue: value,
      dateText: value,
      undetermined: false
    })
  },

  onToggleUndetermined() {
    const undetermined = !this.data.undetermined
    this.setData({
      undetermined,
      dateValue: undetermined ? '' : this.data.dateValue,
      dateText: undetermined ? '' : this.data.dateText
    })
  },

  onPriceInput(e) {
    this.setData({
      price: sanitizePrice(e && e.detail && e.detail.value)
    })
  },

  onMobileInput(e) {
    this.setData({
      mobile: safeText(e && e.detail && e.detail.value).replace(/\D/g, '').slice(0, 11)
    })
  },

  onRemarkInput(e) {
    this.setData({
      remark: safeText(e && e.detail && e.detail.value).slice(0, 300)
    })
  },

  openRegionPopup() {
    if (!this.data.provinces.length) {
      wx.showToast({ title: '地区加载中', icon: 'none' })
      return
    }
    this.setData({
      regionPopupVisible: true
    })
  },

  closeRegionPopup() {
    this.setData({
      regionPopupVisible: false
    })
  },

  onRegionPickerChange(e) {
    const value = Array.isArray(e && e.detail && e.detail.value) ? e.detail.value : [0, 0, 0]
    const provinceIndex = Number(value[0]) || 0
    const cityIndex = Number(value[1]) || 0
    const countyIndex = Number(value[2]) || 0
    const province = this.data.provinces[provinceIndex] || null
    const cities = getNodeChildren(province, 'city')
    const safeCityIndex = cityIndex >= cities.length ? 0 : cityIndex
    const city = cities[safeCityIndex] || null
    const counties = getNodeChildren(city, 'county')
    const safeCountyIndex = countyIndex >= counties.length ? 0 : countyIndex

    this.setData({
      cities,
      counties,
      pickerValue: [provinceIndex, safeCityIndex, safeCountyIndex]
    })
  },

  confirmRegion() {
    const pickerValue = this.data.pickerValue || [0, 0, 0]
    const province = this.data.provinces[pickerValue[0]] || null
    const city = this.data.cities[pickerValue[1]] || null
    const county = this.data.counties[pickerValue[2]] || null
    if (!province || !city || !county) {
      wx.showToast({ title: '请选择完整地区', icon: 'none' })
      return
    }
    this.setData({
      regionPopupVisible: false,
      regionText: `${province.name}${city.name}${county.name}`,
      selectedProvinceId: province.id,
      selectedProvinceName: province.name,
      selectedCityId: city.id,
      selectedCountyId: county.id
    })
  },

  validate() {
    if (!this.data.price.trim()) {
      wx.showToast({ title: '请输入婚礼预算', icon: 'none' })
      return false
    }
    if (!this.data.regionText) {
      wx.showToast({ title: '请选择婚礼地区', icon: 'none' })
      return false
    }
    if (!/^1\d{10}$/.test(this.data.mobile)) {
      wx.showToast({ title: '请输入正确联系电话', icon: 'none' })
      return false
    }
    return true
  },

  async submit() {
    if (this.data.submitting || !this.validate()) return
    this.setData({ submitting: true })
    wx.showLoading({
      title: '提交中...',
      mask: true
    })
    try {
      const res = await network.xgwGetSuggestSubmit({
        cityid: this.data.selectedCityId,
        contenta: this.data.remark.trim(),
        countyid: this.data.selectedCountyId,
        datepicker: this.data.undetermined ? '' : this.data.dateValue,
        mobile: this.data.mobile,
        price: this.data.price.trim(),
        provinceid: this.data.selectedProvinceName
      })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        wx.showToast({
          title: (res && (res.message || res.msg)) || '提交失败',
          icon: 'none'
        })
        return
      }
      wx.showToast({
        title: (res && (res.message || res.msg)) || '提交成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 300)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err && err.message ? err.message : '提交失败',
        icon: 'none'
      })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
