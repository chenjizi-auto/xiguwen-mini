const network = require('../../api/network.js')

const SORT_OPTIONS = [
  { key: 'browse', label: '浏览' },
  { key: 'price', label: '价格' },
  { key: 'time', label: '时间' }
]

const DEFAULT_PROVINCE_NAME = '四川省'
const DEFAULT_CITY_NAME = '成都市'
const DEFAULT_CITY_ID = '273'

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function formatPrice(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return safeText(value, '0')
  return num % 1 === 0 ? String(num) : num.toFixed(2)
}

function formatDateTime(value) {
  const text = safeText(value)
  if (!text) return '--'
  return text.length >= 16 ? text.slice(0, 16) : text
}

function mapNeedItem(item = {}) {
  const status = asNumber(item.status, 0)
  return {
    id: asNumber(item.id, 0),
    title: `${asNumber(item.type, 0) === 2 ? '[商城] ' : '[婚庆] '}${safeText(item.title, '未命名需求')}`,
    priceText: `¥ ${formatPrice(item.price)}`,
    createTime: formatDateTime(item.create_ti),
    browseText: `浏览：${asNumber(item.browsingvolume, 0)}`,
    joinText: `参与：${asNumber(item.renshu, 0)}`,
    address: safeText(item.dizhi || item.address, '--'),
    isActive: status === 1,
    raw: item
  }
}

function getErrorMessage(res, fallback = '加载失败，请稍后重试') {
  if (!res) return fallback
  return res.message || res.msg || fallback
}

function isSuccessResponse(res) {
  return asNumber(res && res.code, -1) === 0
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

function extractCityRegionTree(res) {
  const site = Array.isArray(res && res.data && res.data.site) ? res.data.site : []
  const provinces = site
    .filter(item => safeText(item && item.pid) === '0')
    .map(item => ({
      id: safeText(item && item.id),
      name: safeText(item && item.name),
      city: []
    }))
    .filter(item => item.id && item.name)

  const provinceMap = {}
  provinces.forEach(province => {
    provinceMap[province.id] = province
  })

  site.forEach(item => {
    const pid = safeText(item && item.pid)
    const province = provinceMap[pid]
    if (!province) return
    province.city.push({
      id: safeText(item && item.id),
      name: safeText(item && item.name),
      county: []
    })
  })

  return provinces
}

function buildRegionSelection(province, city, county) {
  return [province && province.name, city && city.name, county && county.name].filter(Boolean)
}

function resolveRegionSelection(provinces, region, currentCityId = '') {
  const provinceName = safeText(region && region[0])
  const cityName = safeText(region && region[1])
  const provinceList = Array.isArray(provinces) ? provinces : []

  let province =
    provinceList.find(item => item.name === provinceName) ||
    provinceList.find(item => getNodeChildren(item, 'city').some(city => city.id === safeText(currentCityId))) ||
    provinceList.find(item => getNodeChildren(item, 'city').some(city => city.name === cityName)) ||
    provinceList[0]

  if (!province) {
    return {
      region: Array.isArray(region) ? region : [],
      province: null,
      city: null,
      county: null
    }
  }

  const cities = getNodeChildren(province, 'city')
  let city =
    cities.find(item => item.name === cityName) ||
    cities.find(item => item.id === safeText(currentCityId)) ||
    cities[0]

  if (!city) {
    return {
      region: [province.name],
      province,
      city: null,
      county: null
    }
  }

  const counties = getNodeChildren(city, 'county')
  const county =
    counties.find(item => item.name === safeText(region && region[2])) ||
    counties[0] ||
    null

  return {
    region: buildRegionSelection(province, city, county),
    province,
    city,
    county
  }
}

function buildRegionColumns(provinces, activeProvinceId, activeCityId) {
  const provinceList = Array.isArray(provinces) ? provinces : []
  const currentProvince =
    provinceList.find(item => item.id === safeText(activeProvinceId)) ||
    provinceList.find(item => getNodeChildren(item, 'city').some(city => city.id === safeText(activeCityId))) ||
    provinceList[0] ||
    null
  const provinceIndex = Math.max(provinceList.findIndex(item => item.id === safeText(currentProvince && currentProvince.id)), 0)
  const cityList = getNodeChildren(currentProvince, 'city')
  const currentCity =
    cityList.find(item => item.id === safeText(activeCityId)) ||
    cityList[0] ||
    null
  const cityIndex = Math.max(cityList.findIndex(item => item.id === safeText(currentCity && currentCity.id)), 0)

  return {
    columns: [
      { values: provinceList.map(item => item.name), defaultIndex: provinceIndex },
      { values: cityList.map(item => item.name), defaultIndex: cityIndex }
    ],
    currentProvince,
    currentCity,
    provinceIndex,
    cityIndex
  }
}

function resolveRegionSelectionByIndexes(provinces, indexes) {
  const provinceList = Array.isArray(provinces) ? provinces : []
  const indexList = Array.isArray(indexes) ? indexes : []
  const province = provinceList[asNumber(indexList[0], 0)] || provinceList[0] || null
  const cityList = getNodeChildren(province, 'city')
  const city = cityList[asNumber(indexList[1], 0)] || cityList[0] || null
  const countyList = getNodeChildren(city, 'county')
  const county = countyList[0] || null

  return {
    region: buildRegionSelection(province, city, county),
    province,
    city,
    county
  }
}

function runNextTick(callback) {
  if (typeof wx !== 'undefined' && typeof wx.nextTick === 'function') {
    wx.nextTick(callback)
    return
  }
  setTimeout(callback, 0)
}

Page({
  data: {
    sortOptions: SORT_OPTIONS,
    tabIndex: 0,
    region: [DEFAULT_PROVINCE_NAME, DEFAULT_CITY_NAME],
    cityName: DEFAULT_CITY_NAME,
    cityId: DEFAULT_CITY_ID,
    countyId: '',
    countyName: '',
    sortKey: '',
    sortOrder: 'desc',
    list: [],
    page: 1,
    rows: 10,
    loading: false,
    finished: false,
    errorText: '',
    regionLoading: false,
    regionLoadError: '',
    regionPickerShow: false,
    regionColumns: [{ values: [] }, { values: [] }],
    activeProvinceId: '',
    activeCityId: DEFAULT_CITY_ID
  },

  onLoad(options) {
    this.regionTree = []
    this.regionLoadTask = null
    this.pendingReset = false
    const tabIndex = asNumber(options && options.tabIndex, 0)
    this.setData({
      tabIndex: tabIndex > 0 ? 1 : 0
    })
    wx.setNavigationBarTitle({
      title: '查看需求'
    })
    this.loadRegions()
  },

  onShow() {
    this.setData({
      countyId: '',
      countyName: ''
    }, () => {
      this.fetchList(true)
    })
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

  getRequestParams(page) {
    const isLocal = this.data.tabIndex === 0
    return {
      type: '1',
      cityId: isLocal ? this.data.cityId : '',
      countyid: isLocal ? this.data.countyId : '',
      browsingsort: this.data.sortKey === 'browse' ? this.data.sortOrder : '',
      pricesorting: this.data.sortKey === 'price' ? this.data.sortOrder : '',
      timesorting: this.data.sortKey === 'time' ? this.data.sortOrder : '',
      p: page,
      rows: this.data.rows
    }
  },

  onNationwideTap() {
    this.setData(
      {
        regionPickerShow: false,
        tabIndex: 1,
        countyId: '',
        countyName: '',
        page: 1,
        list: [],
        finished: false,
        errorText: ''
      },
      () => {
        this.fetchList(true)
      }
    )
  },

  async loadRegions(force = false) {
    if (this.regionLoadTask && !force) {
      return this.regionLoadTask
    }

    const task = (async () => {
      this.setData({
        regionLoading: true,
        regionLoadError: ''
      })

      let regionTree = []
      let lastError = null

      try {
        const cityRes = await network.cityList({})
        regionTree = isSuccessResponse(cityRes) ? extractCityRegionTree(cityRes) : []
      } catch (err) {
        lastError = err
      }

      if (!regionTree.length) {
        try {
          const regionRes = await network.xgwRegionList({})
          regionTree = isSuccessResponse(regionRes) ? extractRegionTree(regionRes) : []
        } catch (err) {
          lastError = err
        }
      }

      this.regionTree = regionTree

      if (!regionTree.length) {
        this.setData({
          regionLoadError: lastError && lastError.message ? lastError.message : '地区加载失败'
        })
        return []
      }

      const selection = resolveRegionSelection(regionTree, this.data.region, this.data.cityId)
      const picker = buildRegionColumns(
        regionTree,
        selection.province && selection.province.id,
        selection.city && selection.city.id
      )
      this.setData({
        region: selection.city ? selection.region : this.data.region,
        cityName: safeText(selection.city && selection.city.name, this.data.cityName),
        cityId: safeText(selection.city && selection.city.id, this.data.cityId),
        activeProvinceId: safeText(selection.province && selection.province.id),
        activeCityId: safeText(selection.city && selection.city.id, this.data.activeCityId),
        regionColumns: picker.columns,
        regionLoadError: ''
      })
      return regionTree
    })()

    this.regionLoadTask = task

    try {
      return await task
    } finally {
      this.regionLoadTask = null
      this.setData({
        regionLoading: false
      })
    }
  },

  async onCityTap() {
    if (!this.regionTree || !this.regionTree.length) {
      wx.showLoading({
        title: '地区加载中...',
        mask: true
      })
      try {
        const regionTree = await this.loadRegions(true)
        if (!regionTree.length) {
          wx.showToast({
            title: this.data.regionLoadError || '地区加载失败',
            icon: 'none'
          })
          return
        }
      } finally {
        wx.hideLoading()
      }
    }
    const picker = buildRegionColumns(this.regionTree, this.data.activeProvinceId, this.data.activeCityId || this.data.cityId)
    this.setData({
      regionPickerShow: true,
      regionColumns: picker.columns,
      activeProvinceId: safeText(picker.currentProvince && picker.currentProvince.id),
      activeCityId: safeText(picker.currentCity && picker.currentCity.id, this.data.activeCityId)
    }, () => {
      runNextTick(() => {
        const pickerInstance = this.selectComponent('#need-region-picker')
        if (pickerInstance && typeof pickerInstance.setIndexes === 'function') {
          pickerInstance.setIndexes([picker.provinceIndex, picker.cityIndex]).catch(() => {})
        }
      })
    })
  },

  onRegionPickerClose() {
    this.setData({
      regionPickerShow: false
    })
  },

  onRegionPickerChange(e) {
    const values = (e && e.detail && e.detail.value) || []
    const provinceName = safeText(values[0])
    const cityName = safeText(values[1])
    const province =
      (this.regionTree || []).find(item => item.name === provinceName) ||
      (this.regionTree || [])[0]
    if (!province) return
    const cityList = getNodeChildren(province, 'city')
    const currentColumns = this.data.regionColumns || [{ values: [] }, { values: [] }]
    const currentCityValues = (((currentColumns[1] || {}).values) || [])
    const nextCityValues = cityList.map(item => item.name)
    if (JSON.stringify(currentCityValues) !== JSON.stringify(nextCityValues)) {
      const firstCity = cityList[0] || null
      const provinceIndex = Math.max((this.regionTree || []).findIndex(item => item.id === province.id), 0)
      this.setData({
        activeProvinceId: province.id,
        activeCityId: safeText(firstCity && firstCity.id),
        regionColumns: [
          { values: (this.regionTree || []).map(item => item.name), defaultIndex: provinceIndex },
          { values: nextCityValues, defaultIndex: 0 }
        ]
      }, () => {
        runNextTick(() => {
          const pickerInstance = this.selectComponent('#need-region-picker')
          if (pickerInstance && typeof pickerInstance.setIndexes === 'function') {
            pickerInstance.setIndexes([provinceIndex, 0]).catch(() => {})
          }
        })
      })
      return
    }
    const city =
      cityList.find(item => item.name === cityName) ||
      cityList[0] ||
      null
    this.setData({
      activeProvinceId: province.id,
      activeCityId: safeText(city && city.id)
    })
  },

  onRegionPickerConfirm(e) {
    const pickerInstance = this.selectComponent('#need-region-picker')
    const indexes = pickerInstance && typeof pickerInstance.getIndexes === 'function'
      ? pickerInstance.getIndexes()
      : ((e && e.detail && e.detail.index) || [])
    const values = pickerInstance && typeof pickerInstance.getValues === 'function'
      ? pickerInstance.getValues()
      : ((e && e.detail && e.detail.value) || [])
    const selectionByIndex = resolveRegionSelectionByIndexes(this.regionTree, indexes)
    const selection = selectionByIndex.city
      ? selectionByIndex
      : resolveRegionSelection(this.regionTree, values, this.data.activeCityId || this.data.cityId)
    if (!selection.city) {
      this.setData({ regionPickerShow: false })
      return
    }
    this.setData(
      {
        regionPickerShow: false,
        tabIndex: 0,
        region: [safeText(selection.province && selection.province.name), selection.city.name],
        cityName: selection.city.name,
        cityId: selection.city.id,
        countyId: '',
        countyName: '',
        activeProvinceId: safeText(selection.province && selection.province.id),
        activeCityId: selection.city.id,
        page: 1,
        list: [],
        finished: false,
        errorText: ''
      },
      () => {
        this.fetchList(true)
      }
    )
  },

  onSortTap(e) {
    const key = safeText(e && e.currentTarget ? e.currentTarget.dataset.key : '')
    if (!key) return
    const nextOrder =
      this.data.sortKey === key
        ? this.data.sortOrder === 'desc' ? 'asc' : 'desc'
        : 'desc'
    this.setData(
      {
        sortKey: key,
        sortOrder: nextOrder,
        page: 1,
        list: [],
        finished: false,
        errorText: ''
      },
      () => {
        this.fetchList(true)
      }
    )
  },

  async fetchList(reset = false) {
    if (this.data.loading) {
      if (reset) {
        this.pendingReset = true
      }
      return
    }
    const nextPage = reset ? 1 : this.data.page
    this.setData({
      loading: true,
      errorText: reset ? '' : this.data.errorText
    })

    try {
      const res = await network.xgwOtherNeedList(this.getRequestParams(nextPage))
      if (!isSuccessResponse(res)) {
        throw new Error(getErrorMessage(res))
      }
      const source = Array.isArray(res.data) ? res.data : []
      const list = source.map(mapNeedItem)
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
        errorText: err && err.message ? err.message : '加载失败，请稍后重试'
      })
      if (reset) {
        this.setData({ list: [] })
      }
    } finally {
      if (this.pendingReset) {
        this.pendingReset = false
        this.fetchList(true)
      }
    }
  },

  onItemTap(e) {
    const id = asNumber(e.currentTarget.dataset.id, 0)
    if (!id) return
    wx.navigateTo({
      url: `/pages/need/detail?id=${id}`
    })
  }
})
