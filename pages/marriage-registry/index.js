const network = require('../../api/network.js')
const CONFIG = require('../../config.js')

const MUNICIPALITIES = {
  北京市: '北京市',
  上海市: '上海市',
  天津市: '天津市',
  重庆市: '重庆市'
}

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function getErrorMessage(res, fallback = '加载失败，请稍后重试') {
  if (!res) return fallback
  return res.message || res.msg || fallback
}

function normalizeName(name = '') {
  return String(name).trim()
}

function normalizeRegionList(site = []) {
  const all = Array.isArray(site) ? site : []
  const provinces = all
    .filter(item => safeText(item && item.pid) === '0')
    .map(item => ({
      id: safeText(item && item.id),
      name: normalizeName(item && item.name)
    }))
    .filter(item => item.id && item.name)

  const cityMap = {}
  provinces.forEach(province => {
    cityMap[province.id] = all
      .filter(item => safeText(item && item.pid) === province.id)
      .map(item => ({
        id: safeText(item && item.id),
        name: normalizeName(item && item.name),
        pid: safeText(item && item.pid)
      }))
      .filter(item => item.id && item.name)

    if (cityMap[province.id].length === 0) {
      cityMap[province.id] = [
        {
          id: province.id,
          name: province.name,
          pid: province.id
        }
      ]
    }
  })

  return {
    provinces,
    cityMap
  }
}

function buildPickerColumns(provinces, cityMap, activeProvinceId, activeCityId) {
  const provinceValues = (provinces || []).map(item => item.name)
  const currentProvince =
    (provinces || []).find(item => item.id === activeProvinceId) ||
    (provinces || [])[0] ||
    null
  const cityOptions = currentProvince ? cityMap[currentProvince.id] || [] : []
  const cityValues = cityOptions.map(item => item.name)
  const currentCity =
    cityOptions.find(item => item.id === activeCityId) ||
    cityOptions[0] ||
    null
  return {
    columns: [
      {
        values: provinceValues
      },
      {
        values: cityValues
      }
    ],
    currentProvince,
    currentCity
  }
}

function normalizeList(list) {
  if (!Array.isArray(list)) return []
  return list.map(item => ({
    id: safeText(item && item.id),
    title: safeText(item && item.title, '婚姻登记处'),
    address: safeText(item && item.address, '暂无地址'),
    phone: safeText(item && item.phone)
  }))
}

function buildFullAddress(province, city, address) {
  return normalizeName(`${safeText(province)}${safeText(city)}${safeText(address)}`)
}

Page({
  data: {
    province: '',
    city: '成都市',
    loading: false,
    loadError: '',
    list: [],
    selectedCityId: '',
    selectedCityName: '',
    provinceOptions: [],
    cityOptionsMap: {},
    activeProvinceId: '',
    activeCityName: '',
    regionPickerShow: false,
    regionColumns: [{ values: [] }, { values: [] }],
    geocodeCache: {}
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '婚姻登记处'
    })
    this.hydrateSelectedCity()
    this.loadProvinceMap()
  },

  onShow() {
    this.hydrateSelectedCity()
  },

  onPullDownRefresh() {
    this.fetchList().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  hydrateSelectedCity() {
    const selected = wx.getStorageSync('selectedCity')
    if (!selected || !selected.name) return
    const city = normalizeName(selected.name)
    const cityId = safeText(selected.id)
    const province = this.resolveProvinceBySelected(selected)
    const previousCityId = safeText(this.data.selectedCityId)
    const previousCityName = normalizeName(this.data.selectedCityName)
    const nextData = {
      city,
      selectedCityId: cityId,
      selectedCityName: city
    }
    if (province) {
      nextData.province = province
    }
    this.setData(nextData)
    this.syncPickerSelection(province, city, cityId)
    const cityChanged = (cityId && cityId !== previousCityId) || (!cityId && city && city !== previousCityName)
    if (city && (this.data.list.length === 0 || cityChanged)) {
      this.fetchList()
    }
  },

  resolveProvinceBySelected(selected) {
    const cityName = normalizeName(selected && selected.name)
    if (MUNICIPALITIES[cityName]) {
      return MUNICIPALITIES[cityName]
    }
    const provinceOptions = this.data.provinceOptions || []
    const cityMap = this.data.cityOptionsMap || {}
    const cityId = safeText(selected && selected.id)
    const cityPid = safeText(selected && selected.pid)
    const matchedProvince = provinceOptions.find(item => item.id === cityPid)
    if (matchedProvince) return matchedProvince.name
    const byCityId = provinceOptions.find(item => {
      const cities = cityMap[item.id] || []
      return cities.some(city => city.id === cityId)
    })
    return normalizeName((byCityId && byCityId.name) || this.data.province)
  },

  async loadProvinceMap() {
    try {
      const res = await network.cityList({})
      if (!res || res.code !== 0) return
      const site = Array.isArray(res.data && res.data.site) ? res.data.site : []
      const normalized = normalizeRegionList(site)
      this.setData({
        provinceOptions: normalized.provinces,
        cityOptionsMap: normalized.cityMap
      })
      const selected = wx.getStorageSync('selectedCity')
      const province = this.resolveProvinceBySelected(selected || {})
      if (province) {
        this.setData({ province })
      }
      this.syncPickerSelection(province, this.data.city, safeText(selected && selected.id))
      if (this.data.city && this.data.list.length === 0) {
        this.fetchList()
      }
    } catch (err) {}
  },

  syncPickerSelection(provinceName, cityName, cityId = '') {
    const provinces = this.data.provinceOptions || []
    const cityMap = this.data.cityOptionsMap || {}
    if (!provinces.length) return
    const province =
      provinces.find(item => item.name === normalizeName(provinceName)) ||
      provinces.find(item => {
        const cities = cityMap[item.id] || []
        return cities.some(city => city.id === cityId || city.name === normalizeName(cityName))
      }) ||
      provinces[0]
    const cityList = cityMap[province.id] || []
    const city =
      cityList.find(item => item.id === cityId || item.name === normalizeName(cityName)) ||
      cityList[0] ||
      null
    const picker = buildPickerColumns(provinces, cityMap, province.id, city ? city.id : '')
    this.setData({
      activeProvinceId: province.id,
      activeCityName: city ? city.name : '',
      regionColumns: picker.columns
    })
  },

  onProvinceInput(e) {
    this.setData({
      province: normalizeName(e.detail.value)
    })
  },

  onCityInput(e) {
    this.setData({
      city: normalizeName(e.detail.value)
    })
  },

  onChooseCityTap() {
    if (!(this.data.provinceOptions || []).length) {
      wx.showToast({
        title: '城市数据加载中',
        icon: 'none'
      })
      return
    }
    this.syncPickerSelection(this.data.province, this.data.city, this.data.selectedCityId)
    this.setData({
      regionPickerShow: true
    })
  },

  async onSearchTap() {
    await this.fetchList()
  },

  onClearTap() {
    this.setData({
      loadError: '',
      list: []
    })
  },

  onRegionPickerClose() {
    this.setData({
      regionPickerShow: false
    })
  },

  onRegionPickerChange(e) {
    const picker = e.detail
    const values = (picker && picker.value) || []
    const provinceName = normalizeName(values[0])
    const cityName = normalizeName(values[1])
    const provinces = this.data.provinceOptions || []
    const cityMap = this.data.cityOptionsMap || {}
    const province = provinces.find(item => item.name === provinceName) || provinces[0]
    if (!province) return
    const cityList = cityMap[province.id] || []
    const cityValues = cityList.map(item => item.name)
    const currentColumns = this.data.regionColumns || [{ values: [] }, { values: [] }]
    const currentCityValues = (((currentColumns[1] || {}).values) || [])
    if (JSON.stringify(cityValues) !== JSON.stringify(currentCityValues)) {
      this.setData({
        activeProvinceId: province.id,
        activeCityName: cityList[0] ? cityList[0].name : '',
        regionColumns: [
          { values: (provinces || []).map(item => item.name) },
          { values: cityValues }
        ]
      })
      return
    }
    this.setData({
      activeProvinceId: province.id,
      activeCityName: cityName
    })
  },

  onRegionPickerConfirm(e) {
    const values = (e.detail && e.detail.value) || []
    const provinceName = normalizeName(values[0])
    const cityName = normalizeName(values[1])
    const province = (this.data.provinceOptions || []).find(item => item.name === provinceName)
    const cityList = (province && this.data.cityOptionsMap[province.id]) || []
    const city = cityList.find(item => item.name === cityName) || cityList[0]
    this.setData({
      regionPickerShow: false,
      province: provinceName,
      city: city ? city.name : cityName,
      selectedCityId: city ? city.id : '',
      selectedCityName: city ? city.name : cityName
    })
    wx.setStorageSync('selectedCity', {
      id: city ? city.id : '',
      name: city ? city.name : cityName,
      pid: province ? province.id : '',
      initial: '',
      pinyin: '',
      cityid: city ? city.id : ''
    })
    this.fetchList()
  },

  async fetchList() {
    const province = normalizeName(this.data.province)
    const city = normalizeName(this.data.city)
    if (!city) {
      wx.showToast({
        title: '请先输入城市',
        icon: 'none'
      })
      return
    }
    this.setData({
      loading: true,
      loadError: ''
    })
    try {
      const res = await network.xgwMarriageRegistry({
        province,
        city
      })
      if (!res || res.code !== 0) {
        throw new Error(getErrorMessage(res))
      }
      this.setData({
        loading: false,
        loadError: '',
        list: normalizeList(res.data)
      })
    } catch (err) {
      this.setData({
        loading: false,
        loadError: err && err.message ? err.message : '加载失败，请稍后重试',
        list: []
      })
    }
  },

  onCallTap(e) {
    const phone = safeText(e.currentTarget.dataset.phone)
    if (!phone) {
      wx.showToast({
        title: '暂无联系电话',
        icon: 'none'
      })
      return
    }
    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => {}
    })
  },

  onCopyAddressTap(e) {
    const title = safeText(e.currentTarget.dataset.title)
    const address = safeText(e.currentTarget.dataset.address)
    if (!address) {
      wx.showToast({
        title: '暂无地址',
        icon: 'none'
      })
      return
    }
    const fullAddress = buildFullAddress(this.data.province, this.data.city, address)
    wx.setClipboardData({
      data: title ? `${title} ${fullAddress}` : fullAddress
    })
  },

  async onNavigateTap(e) {
    const title = safeText(e.currentTarget.dataset.title)
    const address = safeText(e.currentTarget.dataset.address)
    const phone = safeText(e.currentTarget.dataset.phone)
    if (!address) {
      wx.showToast({
        title: '暂无地址',
        icon: 'none'
      })
      return
    }
    const fullAddress = buildFullAddress(this.data.province, this.data.city, address)
    const key = CONFIG && CONFIG.qqMapKey ? safeText(CONFIG.qqMapKey).trim() : ''
    if (!key) {
      this.showNavigateFallback(title, fullAddress, phone, '未配置地图定位服务，已切换为地址操作')
      return
    }

    const cacheKey = `${title}::${fullAddress}`
    const cached = this.data.geocodeCache[cacheKey]
    if (cached && typeof cached.latitude === 'number' && typeof cached.longitude === 'number') {
      this.openResolvedLocation(cached.latitude, cached.longitude, title, address, fullAddress, phone)
      return
    }

    wx.showLoading({
      title: '定位中...',
      mask: true
    })

    try {
      const location = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://apis.map.qq.com/ws/geocoder/v1/',
          method: 'GET',
          data: {
            address: fullAddress,
            key
          },
          success: res => {
            const point = res && res.data && res.data.result && res.data.result.location
            if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number') {
              reject(new Error('未获取到坐标'))
              return
            }
            resolve(point)
          },
          fail: reject
        })
      })
      const geocodeCache = Object.assign({}, this.data.geocodeCache, {
        [cacheKey]: {
          latitude: location.lat,
          longitude: location.lng
        }
      })
      this.setData({ geocodeCache })
      this.openResolvedLocation(location.lat, location.lng, title, address, fullAddress, phone)
    } catch (err) {
      this.showNavigateFallback(title, fullAddress, phone, '定位失败，已为你保留地址操作')
    } finally {
      wx.hideLoading()
    }
  },

  openResolvedLocation(latitude, longitude, title, address, fullAddress, phone) {
    wx.openLocation({
      latitude,
      longitude,
      name: title || '婚姻登记处',
      address,
      scale: 18,
      fail: () => {
        this.showNavigateFallback(title, fullAddress, phone, '无法直接打开地图，已切换为地址操作')
      }
    })
  },

  showNavigateFallback(title, fullAddress, phone, tip) {
    wx.showActionSheet({
      itemList: phone ? ['复制地址', '拨打电话'] : ['复制地址'],
      alertText: tip,
      success: res => {
        if (res.tapIndex === 0) {
          wx.setClipboardData({
            data: title ? `${title} ${fullAddress}` : fullAddress
          })
          return
        }
        if (phone && res.tapIndex === 1) {
          wx.makePhoneCall({
            phoneNumber: phone,
            fail: () => {}
          })
        }
      },
      fail: () => {}
    })
  }
})
