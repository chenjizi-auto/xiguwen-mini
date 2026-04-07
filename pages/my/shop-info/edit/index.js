const network = require('../../../../api/network.js')

const DEFAULT_COVER = '/images/load_img.webp'
const MAX_PHOTOS = 9

function asNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

function normalizeArray(list) {
  if (!Array.isArray(list)) return []
  return list.map(item => safeStr(item)).filter(Boolean)
}

function isRemotePath(filePath = '') {
  const text = safeStr(filePath).trim()
  return /^https?:\/\//i.test(text) || text.startsWith('/')
}

function extractUploadedPath(res) {
  const data = res && res.data
  const value =
    (res && (res.url || res.path || res.src || res.photourl)) ||
    (data &&
      (data.url ||
        data.path ||
        data.src ||
        data.photourl ||
        data.image ||
        data.file ||
        data.background)) ||
    data
  if (typeof value === 'string' || typeof value === 'number') {
    return safeStr(value).trim()
  }
  return ''
}

function buildAreaValue(data = {}) {
  const province = safeStr(data.provinceid)
  const city = safeStr(data.cityid)
  const county = safeStr(data.countyid)
  return [province, city, county].filter(Boolean).join('-')
}

function buildAreaText(data = {}) {
  const province = safeStr(data.provinceid)
  const city = safeStr(data.cityid)
  const county = safeStr(data.countyid)
  return [province, city, county].filter(Boolean).join(' ')
}

function getNodeChildren(node, key) {
  return Array.isArray(node && node[key]) ? node[key] : []
}

function normalizeCountyNode(node) {
  return {
    id: safeStr(node && node.id),
    name: safeStr(node && node.name)
  }
}

function normalizeCityNode(node) {
  return {
    id: safeStr(node && node.id),
    name: safeStr(node && node.name),
    county: getNodeChildren(node, 'county').map(normalizeCountyNode)
  }
}

function normalizeProvinceNode(node) {
  return {
    id: safeStr(node && node.id),
    name: safeStr(node && node.name),
    city: getNodeChildren(node, 'city').map(normalizeCityNode)
  }
}

function normalizeRegionTree(list) {
  if (!Array.isArray(list)) return []
  return list.map(normalizeProvinceNode)
}

function extractRegionTree(res) {
  const data = res && res.data
  if (Array.isArray(data)) return normalizeRegionTree(data)
  if (Array.isArray(data && data.site)) return normalizeRegionTree(data.site)
  if (Array.isArray(data && data.list)) return normalizeRegionTree(data.list)
  return []
}

Page({
  data: {
    loading: true,
    saving: false,
    loadingMeta: false,
    cover: DEFAULT_COVER,
    photos: [],
    form: {
      nickname: '',
      team: 1,
      onlinestatus: 1,
      occupationText: '',
      occupationValue: '',
      areaText: '',
      areaValue: '',
      site: '',
      content: ''
    },
    categoryOptions: [],
    teamOptions: ['个人商家', '团队商家'],
    statusOptions: ['上线', '下线'],
    provinces: [],
    cities: [],
    areas: [],
    provinceIndex: 0,
    cityIndex: 0,
    areaIndex: 0,
    provinceText: '省份',
    cityText: '城市',
    areaTextDisplay: '区县'
  },

  onLoad() {
    this.bootstrap()
  },

  onPullDownRefresh() {
    this.bootstrap().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  async bootstrap() {
    this.setData({ loading: true, loadingMeta: true })
    try {
      await Promise.all([this.loadCategories(), this.loadRegions()])
      await this.fetchDetail()
    } finally {
      this.setData({ loadingMeta: false })
    }
  },

  async loadCategories() {
    try {
      const res = await network.homeCategory({})
      const list = res && res.code === 0 && Array.isArray(res.data) ? res.data : []
      this.setData({ categoryOptions: list })
    } catch (err) {
      this.setData({ categoryOptions: [] })
    }
  },

  async loadRegions() {
    try {
      const res = await network.xgwRegionList({})
      const list = res && res.code === 0 ? extractRegionTree(res) : []
      this.setData({
        provinces: list,
        provinceText: list.length ? safeStr(list[0].name, '省份') : '省份',
        cityText: '城市',
        areaTextDisplay: '区县'
      })
    } catch (err) {
      this.setData({
        provinces: [],
        provinceText: '省份',
        cityText: '城市',
        areaTextDisplay: '区县'
      })
    }
  },

  async setRegionByNames(provinceName, cityName, areaName) {
    const provinces = this.data.provinces || []
    const provinceIndex = Math.max(
      provinces.findIndex(item => safeStr(item.name) === safeStr(provinceName)),
      0
    )
    const province = provinces[provinceIndex]
    if (!province || !province.id) {
      this.setData({
        provinceIndex: 0,
        cityIndex: 0,
        areaIndex: 0,
        cities: [],
        areas: [],
        provinceText: '省份',
        cityText: '城市',
        areaTextDisplay: '区县'
      })
      return
    }

    const cities = getNodeChildren(province, 'city')
    const cityIndex = Math.max(
      cities.findIndex(item => safeStr(item.name) === safeStr(cityName)),
      0
    )
    const city = cities[cityIndex]

    const areas = getNodeChildren(city, 'county')
    const areaIndex = Math.max(
      areas.findIndex(item => safeStr(item.name) === safeStr(areaName)),
      0
    )
    const area = areas[areaIndex]

    const areaText = [province && province.name, city && city.name, area && area.name].filter(Boolean).join(' ')
    const areaValue = [province && province.id, city && city.id, area && area.id].filter(Boolean).join('-')

    this.setData({
      provinceIndex,
      cityIndex,
      areaIndex,
      cities,
      areas,
      provinceText: safeStr(province && province.name, '省份'),
      cityText: safeStr(city && city.name, '城市'),
      areaTextDisplay: safeStr(area && area.name, '区县'),
      'form.areaText': areaText,
      'form.areaValue': areaValue
    })
  },

  async fetchDetail() {
    try {
      const res = await network.xgwStoreInformation({})
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && res.msg) || 'request failed')
      }
      const data = res.data || {}
      this.setData({
        loading: false,
        cover: safeStr(data.background, DEFAULT_COVER) || DEFAULT_COVER,
        photos: normalizeArray(data.shopimg),
        form: {
          nickname: safeStr(data.nickname),
          team: asNumber(data.team, 1) || 1,
          onlinestatus: asNumber(data.onlinestatus, 1) || 1,
          occupationText: safeStr(data.occupationid),
          occupationValue: safeStr(data.occupationid),
          areaText: buildAreaText(data),
          areaValue: buildAreaValue(data),
          site: safeStr(data.site),
          content: safeStr(data.content)
        }
      })
      const currentOccupation = safeStr(data.occupationid)
      const category = (this.data.categoryOptions || []).find(item => safeStr(item.proname) === currentOccupation)
      if (category) {
        this.setData({
          'form.occupationText': safeStr(category.proname),
          'form.occupationValue': safeStr(category.occupationid)
        })
      }
      await this.setRegionByNames(data.provinceid, data.cityid, data.countyid)
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({
        title: '店铺信息加载失败',
        icon: 'none'
      })
    }
  },

  onOccupationChange(e) {
    const index = asNumber(e && e.detail ? e.detail.value : 0, 0)
    const item = (this.data.categoryOptions || [])[index]
    if (!item) return
    this.setData({
      'form.occupationText': safeStr(item.proname),
      'form.occupationValue': safeStr(item.occupationid)
    })
  },

  onProvinceChange(e) {
    const provinceIndex = asNumber(e && e.detail ? e.detail.value : 0, 0)
    const province = (this.data.provinces || [])[provinceIndex]
    if (!province || !province.id) return
    const cities = getNodeChildren(province, 'city')
    const firstCity = cities[0]
    const areas = getNodeChildren(firstCity, 'county')
    const firstArea = areas[0]
    const areaText = [province.name, firstCity && firstCity.name, firstArea && firstArea.name].filter(Boolean).join(' ')
    const areaValue = [province.id, firstCity && firstCity.id, firstArea && firstArea.id].filter(Boolean).join('-')
    this.setData({
      provinceIndex,
      cityIndex: 0,
      areaIndex: 0,
      cities,
      areas,
      provinceText: safeStr(province.name, '省份'),
      cityText: safeStr(firstCity && firstCity.name, '城市'),
      areaTextDisplay: safeStr(firstArea && firstArea.name, '区县'),
      'form.areaText': areaText,
      'form.areaValue': areaValue || safeStr(province.id)
    })
  },

  onCityChange(e) {
    const cityIndex = asNumber(e && e.detail ? e.detail.value : 0, 0)
    const province = (this.data.provinces || [])[this.data.provinceIndex]
    const city = (this.data.cities || [])[cityIndex]
    if (!province || !province.id || !city || !city.id) return
    const areas = getNodeChildren(city, 'county')
    const firstArea = areas[0]
    this.setData({
      cityIndex,
      areaIndex: 0,
      areas,
      cityText: safeStr(city.name, '城市'),
      areaTextDisplay: safeStr(firstArea && firstArea.name, '区县'),
      'form.areaText': [province.name, city.name, firstArea && firstArea.name].filter(Boolean).join(' '),
      'form.areaValue': [province.id, city.id, firstArea && firstArea.id].filter(Boolean).join('-')
    })
  },

  onAreaChange(e) {
    const areaIndex = asNumber(e && e.detail ? e.detail.value : 0, 0)
    const province = (this.data.provinces || [])[this.data.provinceIndex]
    const city = (this.data.cities || [])[this.data.cityIndex]
    const area = (this.data.areas || [])[areaIndex]
    if (!province || !province.id || !city || !city.id || !area || !area.id) return
    this.setData({
      areaIndex,
      areaTextDisplay: safeStr(area.name, '区县'),
      'form.areaText': [province.name, city.name, area.name].filter(Boolean).join(' '),
      'form.areaValue': [province.id, city.id, area.id].filter(Boolean).join('-')
    })
  },

  chooseCover() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const temp = safeStr((res.tempFilePaths || [])[0])
        if (!temp) return
        this.setData({ cover: temp })
      }
    })
  },

  choosePhotos() {
    const remain = Math.max(MAX_PHOTOS - (this.data.photos || []).length, 0)
    if (!remain) {
      wx.showToast({ title: '最多上传9张', icon: 'none' })
      return
    }
    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const list = (this.data.photos || []).concat(res.tempFilePaths || []).slice(0, MAX_PHOTOS)
        this.setData({ photos: list })
      }
    })
  },

  removePhoto(e) {
    const index = asNumber(e && e.currentTarget ? e.currentTarget.dataset.index : -1, -1)
    if (index < 0) return
    const photos = (this.data.photos || []).slice()
    photos.splice(index, 1)
    this.setData({ photos })
  },

  previewPhoto(e) {
    const url = safeStr(e && e.currentTarget ? e.currentTarget.dataset.url : '')
    if (!url) return
    wx.previewImage({
      current: url,
      urls: [this.data.cover].concat(this.data.photos || []).filter(Boolean)
    })
  },

  onInput(e) {
    const key = safeStr(e && e.currentTarget ? e.currentTarget.dataset.key : '')
    if (!key) return
    this.setData({
      [`form.${key}`]: safeStr(e && e.detail ? e.detail.value : '')
    })
  },

  onTeamChange(e) {
    const index = asNumber(e && e.detail ? e.detail.value : 0, 0)
    this.setData({
      'form.team': index + 1
    })
  },

  onStatusChange(e) {
    const index = asNumber(e && e.detail ? e.detail.value : 0, 0)
    this.setData({
      'form.onlinestatus': index + 1
    })
  },

  async uploadIfNeeded(filePath) {
    const source = safeStr(filePath).trim()
    if (!source) return ''
    if (isRemotePath(source)) return source
    const res = await network.xgwUploadImage(source, 1)
    if (!res || res.code !== 0) {
      throw new Error((res && (res.msg || res.message)) || '图片上传失败')
    }
    const uploaded = extractUploadedPath(res)
    if (!uploaded) {
      throw new Error('图片上传失败')
    }
    return uploaded
  },

  async onSave() {
    if (this.data.saving) return
    const form = this.data.form || {}
    if (!safeStr(form.nickname).trim()) {
      wx.showToast({ title: '请输入店铺名称', icon: 'none' })
      return
    }
    if (!safeStr(form.areaValue).trim()) {
      wx.showToast({ title: '缺少服务区域', icon: 'none' })
      return
    }
    if (!safeStr(form.occupationValue).trim()) {
      wx.showToast({ title: '请选择职业类别', icon: 'none' })
      return
    }
    if (!safeStr(this.data.cover).trim()) {
      wx.showToast({ title: '请上传店铺背景图', icon: 'none' })
      return
    }
    if (!(this.data.photos || []).length) {
      wx.showToast({ title: '请至少上传1张店铺图片', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    wx.showLoading({
      title: '保存中...',
      mask: true
    })
    try {
      const background = await this.uploadIfNeeded(this.data.cover)
      if (!background) {
        throw new Error('店铺背景图上传失败')
      }
      const uploadedPhotos = []
      const photos = this.data.photos || []
      for (let i = 0; i < photos.length; i += 1) {
        uploadedPhotos.push(await this.uploadIfNeeded(photos[i]))
      }
      const res = await network.xgwStoreInformationUpdate({
        onlinestatus: asNumber(form.onlinestatus, 1),
        nickname: safeStr(form.nickname).trim(),
        area: safeStr(form.areaValue).trim(),
        background,
        content: safeStr(form.content).trim(),
        occupation: safeStr(form.occupationValue).trim(),
        shopimg: uploadedPhotos.join(','),
        shoptype: asNumber(form.team, 1),
        site: safeStr(form.site).trim()
      })
      if (!res || res.code !== 0) {
        throw new Error((res && (res.msg || res.message)) || '保存失败')
      }
      wx.hideLoading()
      wx.showToast({
        title: (res && (res.msg || res.message)) || '保存成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 350)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: safeStr(err && (err.message || err.errMsg), '保存失败'),
        icon: 'none'
      })
    } finally {
      this.setData({ saving: false })
    }
  }
})
