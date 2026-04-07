const network = require('../../../../api/network.js')
const WXAPI = require('apifm-wxapi')
const xgwAuth = require('../../../../utils/xgw-auth.js')

const DEFAULT_COVER = '/images/load_img.webp'
const MAX_PHOTO_COUNT = 9

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function isRemotePath(value = '') {
  return /^https?:\/\//i.test(String(value))
}

function splitImages(value) {
  if (Array.isArray(value)) return value.map(item => safeText(item)).filter(Boolean)
  const text = safeText(value)
  return text ? text.split(',').map(item => item.trim()).filter(Boolean) : []
}

function buildAreaValue(ids = {}) {
  return [safeText(ids.provinceId), safeText(ids.cityId), safeText(ids.areaId)].filter(Boolean).join('-')
}

function buildAreaText(names = {}) {
  return [safeText(names.provinceName), safeText(names.cityName), safeText(names.areaName)].filter(Boolean).join(' ')
}

function getErrorMessage(err, fallback = '保存失败，请稍后重试') {
  if (!err) return fallback
  if (typeof err === 'string') return err
  return err.message || err.errMsg || fallback
}

Page({
  data: {
    shopId: 0,
    pageTitle: '添加商品',
    loading: true,
    saving: false,
    parentTypes: [],
    childTypes: [],
    freightList: [],
    provinces: [],
    cities: [],
    areas: [],
    provinceIndex: 0,
    cityIndex: 0,
    areaIndex: 0,
    provinceText: '选择省份',
    cityText: '选择城市',
    areaTextDisplay: '选择区县',
    form: {
      parentTypeId: 0,
      parentTypeText: '',
      childTypeId: 0,
      childTypeText: '',
      name: '',
      price: '',
      unit: '',
      couponPrice: '',
      weight: '',
      freightId: 0,
      freightText: '',
      areaValue: '',
      areaText: ''
    },
    photoList: [],
    defaultCover: DEFAULT_COVER,
    maxPhotoCount: MAX_PHOTO_COUNT
  },

  async onLoad(options) {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    const shopId = asNumber(options && options.id, 0)
    const pageTitle = shopId ? '编辑商品' : '添加商品'
    this.setData({ shopId, pageTitle })
    wx.setNavigationBarTitle({ title: pageTitle })
    await this.bootstrap()
  },

  async bootstrap() {
    this.setData({ loading: true })
    try {
      await Promise.all([this.fetchParentTypes(), this.fetchFreightList(), this.loadRegions()])
      if (this.data.shopId) {
        await this.fetchDetail(this.data.shopId)
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  async fetchParentTypes() {
    const res = await network.xgwCommodityTypeParent({})
    this.setData({
      parentTypes: Array.isArray(res && res.data) ? res.data.map(item => ({
        id: asNumber(item.id, 0),
        name: safeText(item.name)
      })) : []
    })
  },

  async fetchChildTypes(parentId) {
    if (!parentId) {
      this.setData({ childTypes: [] })
      return []
    }
    const res = await network.xgwCommodityTypeChild({ pid: parentId })
    const childTypes = Array.isArray(res && res.data) ? res.data.map(item => ({
      id: asNumber(item.id, 0),
      name: safeText(item.name)
    })) : []
    this.setData({ childTypes })
    return childTypes
  },

  async fetchFreightList() {
    const res = await network.xgwCommodityFreightList({})
    this.setData({
      freightList: Array.isArray(res && res.data) ? res.data.map(item => ({
        id: asNumber(item.id, 0),
        title: safeText(item.title)
      })) : []
    })
  },

  async loadRegions() {
    try {
      const res = await WXAPI.province()
      const provinces = res && res.code === 0 && Array.isArray(res.data) ? res.data : []
      this.setData({
        provinces,
        provinceText: provinces.length ? safeText(provinces[0].name, '选择省份') : '选择省份',
        cityText: '选择城市',
        areaTextDisplay: '选择区县'
      })
    } catch (err) {
      this.setData({
        provinces: [],
        provinceText: '选择省份',
        cityText: '选择城市',
        areaTextDisplay: '选择区县'
      })
    }
  },

  async setRegionByIds(provinceId, cityId, areaId) {
    const provinces = this.data.provinces || []
    const provinceIndex = Math.max(provinces.findIndex(item => safeText(item.id) === safeText(provinceId)), 0)
    const province = provinces[provinceIndex]
    if (!province || !province.id) return
    let cities = []
    try {
      const cityRes = await WXAPI.nextRegion(province.id)
      cities = cityRes && cityRes.code === 0 && Array.isArray(cityRes.data) ? cityRes.data : []
    } catch (err) {}
    const cityIndex = Math.max(cities.findIndex(item => safeText(item.id) === safeText(cityId)), 0)
    const city = cities[cityIndex]
    let areas = []
    if (city && city.id) {
      try {
        const areaRes = await WXAPI.nextRegion(city.id)
        areas = areaRes && areaRes.code === 0 && Array.isArray(areaRes.data) ? areaRes.data : []
      } catch (err) {}
    }
    const areaIndex = Math.max(areas.findIndex(item => safeText(item.id) === safeText(areaId)), 0)
    const area = areas[areaIndex]
    this.setData({
      provinceIndex,
      cityIndex,
      areaIndex,
      cities,
      areas,
      provinceText: safeText(province && province.name, '选择省份'),
      cityText: safeText(city && city.name, '选择城市'),
      areaTextDisplay: safeText(area && area.name, '选择区县'),
      'form.areaValue': buildAreaValue({ provinceId: province.id, cityId: city && city.id, areaId: area && area.id }),
      'form.areaText': buildAreaText({
        provinceName: province && province.name,
        cityName: city && city.name,
        areaName: area && area.name
      })
    })
  },

  onInput(e) {
    const key = safeText(e.currentTarget.dataset.key)
    if (!key) return
    this.setData({
      [`form.${key}`]: safeText(e.detail.value)
    })
  },

  async chooseParentType() {
    const list = this.data.parentTypes || []
    if (!list.length) {
      wx.showToast({ title: '暂无商品类目', icon: 'none' })
      return
    }
    wx.showActionSheet({
      itemList: list.map(item => item.name),
      success: async res => {
        const item = list[res.tapIndex]
        if (!item) return
        this.setData({
          'form.parentTypeId': item.id,
          'form.parentTypeText': item.name,
          'form.childTypeId': 0,
          'form.childTypeText': ''
        })
        await this.fetchChildTypes(item.id)
      }
    })
  },

  chooseChildType() {
    const list = this.data.childTypes || []
    if (!list.length) {
      wx.showToast({ title: '请先选择一级类目', icon: 'none' })
      return
    }
    wx.showActionSheet({
      itemList: list.map(item => item.name),
      success: res => {
        const item = list[res.tapIndex]
        if (!item) return
        this.setData({
          'form.childTypeId': item.id,
          'form.childTypeText': item.name
        })
      }
    })
  },

  chooseFreight() {
    const list = this.data.freightList || []
    if (!list.length) {
      wx.showToast({ title: '暂无运费模板', icon: 'none' })
      return
    }
    wx.showActionSheet({
      itemList: list.map(item => item.title),
      success: res => {
        const item = list[res.tapIndex]
        if (!item) return
        this.setData({
          'form.freightId': item.id,
          'form.freightText': item.title
        })
      }
    })
  },

  async onProvinceChange(e) {
    const provinceIndex = asNumber(e && e.detail ? e.detail.value : 0, 0)
    const province = (this.data.provinces || [])[provinceIndex]
    if (!province || !province.id) return
    let cities = []
    try {
      const res = await WXAPI.nextRegion(province.id)
      cities = res && res.code === 0 && Array.isArray(res.data) ? res.data : []
    } catch (err) {}
    this.setData({
      provinceIndex,
      cityIndex: 0,
      areaIndex: 0,
      cities,
      areas: [],
      provinceText: safeText(province.name, '选择省份'),
      cityText: cities.length ? safeText(cities[0].name, '选择城市') : '选择城市',
      areaTextDisplay: '选择区县',
      'form.areaValue': safeText(province.id),
      'form.areaText': safeText(province.name)
    })
  },

  async onCityChange(e) {
    const cityIndex = asNumber(e && e.detail ? e.detail.value : 0, 0)
    const province = (this.data.provinces || [])[this.data.provinceIndex]
    const city = (this.data.cities || [])[cityIndex]
    if (!province || !province.id || !city || !city.id) return
    let areas = []
    try {
      const res = await WXAPI.nextRegion(city.id)
      areas = res && res.code === 0 && Array.isArray(res.data) ? res.data : []
    } catch (err) {}
    this.setData({
      cityIndex,
      areaIndex: 0,
      areas,
      cityText: safeText(city.name, '选择城市'),
      areaTextDisplay: areas.length ? safeText(areas[0].name, '选择区县') : '选择区县',
      'form.areaValue': [province.id, city.id].join('-'),
      'form.areaText': [province.name, city.name].join(' ')
    })
  },

  onAreaChange(e) {
    const areaIndex = asNumber(e && e.detail ? e.detail.value : 0, 0)
    const province = (this.data.provinces || [])[this.data.provinceIndex]
    const city = (this.data.cities || [])[this.data.cityIndex]
    const area = (this.data.areas || [])[areaIndex]
    if (!province || !city || !area) return
    this.setData({
      areaIndex,
      areaTextDisplay: safeText(area.name, '选择区县'),
      'form.areaValue': [province.id, city.id, area.id].join('-'),
      'form.areaText': [province.name, city.name, area.name].join(' ')
    })
  },

  choosePhotos() {
    const remain = Math.max(MAX_PHOTO_COUNT - this.data.photoList.length, 0)
    if (!remain) {
      wx.showToast({ title: '最多上传9张', icon: 'none' })
      return
    }
    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const list = this.data.photoList.concat(res.tempFilePaths || []).slice(0, MAX_PHOTO_COUNT)
        this.setData({ photoList: list })
      }
    })
  },

  removePhoto(e) {
    const index = asNumber(e.currentTarget.dataset.index, -1)
    if (index < 0) return
    const photoList = this.data.photoList.slice()
    photoList.splice(index, 1)
    this.setData({ photoList })
  },

  previewPhoto(e) {
    const current = safeText(e.currentTarget.dataset.url)
    if (!current) return
    wx.previewImage({ current, urls: this.data.photoList })
  },

  validateForm() {
    const form = this.data.form || {}
    if (!form.parentTypeId) return '请选择商品类目'
    if (!form.childTypeId) return '请选择商品子类'
    if (!safeText(form.name).trim()) return '请输入商品名称'
    if (!safeText(form.price).trim()) return '请输入商品价格'
    if (!form.freightId) return '请选择运费模板'
    if (!safeText(form.areaValue).trim()) return '请选择商品地区'
    return ''
  },

  async uploadOne(filePath, index, total) {
    if (!filePath || isRemotePath(filePath)) return filePath
    wx.showLoading({ title: `上传中 ${index}/${total}`, mask: true })
    const res = await network.xgwUploadImage(filePath, 1)
    if (!res || res.code !== 0 || !res.data) {
      throw new Error((res && (res.message || res.msg)) || '图片上传失败')
    }
    return res.data
  },

  async onSave() {
    if (this.data.saving) return
    const error = this.validateForm()
    if (error) {
      wx.showToast({ title: error, icon: 'none' })
      return
    }
    this.setData({ saving: true })
    try {
      const photoList = []
      const total = this.data.photoList.length
      for (let i = 0; i < total; i += 1) {
        photoList.push(await this.uploadOne(this.data.photoList[i], i + 1, total))
      }
      const form = this.data.form || {}
      const payload = {
        pcolumnid: form.parentTypeId,
        columnid: form.childTypeId,
        shopname: safeText(form.name).trim(),
        price: safeText(form.price).trim(),
        company: safeText(form.unit).trim(),
        coupons_price: safeText(form.couponPrice).trim(),
        weigh: safeText(form.weight).trim(),
        expressid: form.freightId,
        site: safeText(form.areaValue).trim(),
        sku1: '',
        sku2: '',
        sku: '[]',
        shopimg: photoList
      }
      wx.showLoading({ title: '保存中...', mask: true })
      const res = this.data.shopId
        ? await network.xgwCommodityEdit(Object.assign({}, payload, { shopid: this.data.shopId }))
        : await network.xgwCommodityAdd(payload)
      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '保存失败')
      }
      wx.showToast({ title: (res && (res.message || res.msg)) || '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 300)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: getErrorMessage(err, '保存失败'), icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },

  async fetchDetail(shopId) {
    const res = await network.xgwCommodityDetail({ shopid: shopId })
    if (!res || res.code !== 0 || !res.data) {
      throw new Error((res && (res.message || res.msg)) || '加载商品失败')
    }
    const data = res.data || {}
    await this.fetchChildTypes(asNumber(data.pcolumnid, 0))
    this.setData({
      photoList: splitImages(data.shopimg),
      form: {
        parentTypeId: asNumber(data.pcolumnid, 0),
        parentTypeText: safeText(data.pcolumnname),
        childTypeId: asNumber(data.columind || data.columnid, 0),
        childTypeText: safeText(data.columnname),
        name: safeText(data.shopname),
        price: safeText(data.price),
        unit: safeText(data.company),
        couponPrice: safeText(data.coupons_price),
        weight: safeText(data.weigh),
        freightId: asNumber(data.expressid, 0),
        freightText: safeText(data.expressname),
        areaValue: '',
        areaText: [safeText(data.province), safeText(data.city), safeText(data.county)].filter(Boolean).join(' ')
      }
    })
    await this.setRegionByIds(data.provinceid, data.cityid, data.countyid)
  }
})
