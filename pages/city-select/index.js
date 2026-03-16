const network = require('../../api/network.js')
const CONFIG = require('../../config.js')

function normalizeCityName(name) {
  if (!name) return ''
  // 尽量与后端城市列表 name 保持一致（一般带“市”）
  return String(name).trim()
}

function buildGroups(cities) {
  const map = {}
  ;(cities || []).forEach(c => {
    const key = (c.initial || '').toUpperCase() || '#'
    if (!map[key]) map[key] = []
    map[key].push(c)
  })
  const keys = Object.keys(map).sort((a, b) => a.localeCompare(b))
  return keys.map(k => ({ key: k, items: map[k] }))
}

Page({
  data: {
    searchVal: '',

    currentCityName: '成都',
    currentCity: null,

    // location
    locating: false,
    locationCityName: '定位中…',
    locationTip: '',
    locationLat: null,
    locationLng: null,

    // data
    hotCities: [],
    allCities: [],
    cityGroups: [],
    indexList: [],
  },

  onLoad() {
    const selected = wx.getStorageSync('selectedCity')
    if (selected && selected.name) {
      this.setData({
        currentCityName: selected.name,
        currentCity: selected
      })
    }
    this.loadCities()
    this.reLocate()
  },

  loadCities() {
    network.cityList({}).then(res => {
      if (!res || res.code !== 0) return
      const data = res.data || {}
      const hotCities = Array.isArray(data.newsite) ? data.newsite : []
      const site = Array.isArray(data.site) ? data.site : []
      const cityGroups = buildGroups(site)
      const indexList = cityGroups.map(g => g.key)
      this.setData({
        hotCities,
        allCities: site,
        cityGroups,
        indexList
      })
    })
  },

  onSearchChange(e) {
    const value = e && e.detail ? e.detail : ''
    this.setData({ searchVal: value })
    const keyword = String(value || '').trim().toLowerCase()
    if (!keyword) {
      const cityGroups = buildGroups(this.data.allCities)
      this.setData({
        cityGroups,
        indexList: cityGroups.map(g => g.key)
      })
      return
    }

    const filtered = (this.data.allCities || []).filter(c => {
      const name = (c.name || '').toLowerCase()
      const pinyin = (c.pinyin || '').toLowerCase()
      return name.includes(keyword) || pinyin.includes(keyword)
    })
    const cityGroups = buildGroups(filtered)
    this.setData({
      cityGroups,
      indexList: cityGroups.map(g => g.key)
    })
  },

  onSearchCancel() {
    this.setData({ searchVal: '' })
    const cityGroups = buildGroups(this.data.allCities)
    this.setData({
      cityGroups,
      indexList: cityGroups.map(g => g.key)
    })
  },

  reLocate() {
    if (this.data.locating) return
    this.setData({
      locating: true,
      locationCityName: '定位中…',
      locationTip: '',
      locationLat: null,
      locationLng: null
    })

    wx.getLocation({
      type: 'gcj02',
      success: res => {
        const lat = res.latitude
        const lng = res.longitude
        this.setData({
          locationLat: lat,
          locationLng: lng,
          locationTip: '已获取定位坐标，可手动选择城市'
        })

        const key = CONFIG && CONFIG.qqMapKey ? String(CONFIG.qqMapKey).trim() : ''
        if (!key) {
          this.setData({
            locationCityName: '定位成功（未配置地图Key）',
            locating: false
          })
          return
        }

        wx.request({
          url: 'https://apis.map.qq.com/ws/geocoder/v1/',
          method: 'GET',
          data: {
            location: `${lat},${lng}`,
            key
          },
          success: r => {
            const city = r && r.data && r.data.result && r.data.result.address_component
              ? r.data.result.address_component.city
              : ''
            const cityName = normalizeCityName(city)
            if (cityName) {
              this.setData({
                locationCityName: cityName,
                locationTip: '点击定位城市可直接使用'
              })
            } else {
              this.setData({
                locationCityName: '定位成功（未识别城市）'
              })
            }
          },
          fail: () => {
            this.setData({
              locationCityName: '定位成功（反查失败）'
            })
          },
          complete: () => {
            this.setData({ locating: false })
          }
        })
      },
      fail: () => {
        this.setData({
          locating: false,
          locationCityName: '定位失败',
          locationTip: '请在系统设置中开启定位权限，或手动选择城市'
        })
      }
    })
  },

  useLocationCity() {
    const name = this.data.locationCityName
    if (!name || name.includes('定位中') || name.includes('失败')) return

    const city = (this.data.allCities || []).find(c => c.name === name || name.includes(c.name) || c.name.includes(name))
    if (!city) {
      wx.showToast({ title: '未匹配到城市，请手动选择', icon: 'none' })
      return
    }
    this.selectCity(city)
  },

  onCityTap(e) {
    const id = e && e.currentTarget ? e.currentTarget.dataset.id : null
    if (id == null) return
    const city = (this.data.allCities || []).find(c => String(c.id) === String(id))
      || (this.data.hotCities || []).find(c => String(c.id) === String(id))
    if (!city) return
    this.selectCity(city)
  },

  selectCity(city) {
    const selected = {
      id: city.id,
      name: city.name,
      initial: city.initial,
      pinyin: city.pinyin,
      pid: city.pid,
      cityid: city.cityid
    }
    wx.setStorageSync('selectedCity', selected)
    wx.navigateBack()
  }
})
