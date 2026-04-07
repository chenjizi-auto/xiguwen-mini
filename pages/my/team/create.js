const network = require('../../../api/network.js')

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function getErrorMessage(res, fallback = '提交失败，请稍后重试') {
  if (!res) return fallback
  return res.message || res.msg || fallback
}

Page({
  data: {
    submitting: false,
    loadingTypes: false,
    typeOptions: [],
    logoTemp: '',
    logoUrl: '',
    backgroundTemp: '',
    backgroundUrl: '',
    name: '',
    typeIndex: -1,
    typeId: '',
    typeText: '',
    region: [],
    regionText: '',
    address: '',
    profile: ''
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '创建社团'
    })
    this.loadTypeOptions()
  },

  async loadTypeOptions() {
    this.setData({ loadingTypes: true })
    try {
      const res = await network.homeCategory({})
      const list = Array.isArray(res && res.data) ? res.data : []
      this.setData({
        loadingTypes: false,
        typeOptions: list.map(item => ({
          id: safeText(item.occupationid),
          name: safeText(item.proname)
        }))
      })
    } catch (err) {
      this.setData({ loadingTypes: false })
    }
  },

  chooseImage(e) {
    const field = e.currentTarget.dataset.field
    if (!field) return
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const filePath = (res.tempFilePaths || [])[0]
        if (!filePath) return
        this.setData({
          [`${field}Temp`]: filePath,
          [`${field}Url`]: ''
        })
      }
    })
  },

  onNameInput(e) {
    this.setData({
      name: safeText(e.detail.value).slice(0, 30)
    })
  },

  onTypeChange(e) {
    const index = Number(e.detail.value)
    const selected = (this.data.typeOptions || [])[index] || null
    this.setData({
      typeIndex: index,
      typeId: selected ? selected.id : '',
      typeText: selected ? selected.name : ''
    })
  },

  onRegionChange(e) {
    const region = Array.isArray(e.detail.value) ? e.detail.value : []
    this.setData({
      region,
      regionText: region.join(' ')
    })
  },

  onAddressInput(e) {
    this.setData({
      address: safeText(e.detail.value).slice(0, 60)
    })
  },

  onProfileInput(e) {
    this.setData({
      profile: safeText(e.detail.value).slice(0, 500)
    })
  },

  async uploadIfNeeded(field, label) {
    const temp = this.data[`${field}Temp`]
    const url = this.data[`${field}Url`]
    if (url) return url
    if (!temp) {
      throw new Error(`请上传${label}`)
    }
    const res = await network.xgwUploadImage(temp, 1)
    if (!res || res.code !== 0 || !res.data) {
      throw new Error(getErrorMessage(res, `${label}上传失败`))
    }
    this.setData({
      [`${field}Url`]: res.data,
      [`${field}Temp`]: ''
    })
    return res.data
  },

  validateForm() {
    if (!this.data.logoTemp && !this.data.logoUrl) {
      wx.showToast({ title: '请添加logo', icon: 'none' })
      return false
    }
    if (!this.data.backgroundTemp && !this.data.backgroundUrl) {
      wx.showToast({ title: '请添加背景', icon: 'none' })
      return false
    }
    if (!this.data.name.trim()) {
      wx.showToast({ title: '请填写名称', icon: 'none' })
      return false
    }
    if (!this.data.typeId) {
      wx.showToast({ title: '请选择社团类型', icon: 'none' })
      return false
    }
    if (!this.data.region.length || this.data.region.length < 3) {
      wx.showToast({ title: '请选择城市', icon: 'none' })
      return false
    }
    if (!this.data.address.trim()) {
      wx.showToast({ title: '请填写详细地址', icon: 'none' })
      return false
    }
    if (!this.data.profile.trim()) {
      wx.showToast({ title: '请填写社团简介', icon: 'none' })
      return false
    }
    return true
  },

  async onSubmit() {
    if (this.data.submitting || !this.validateForm()) return

    this.setData({ submitting: true })
    wx.showLoading({
      title: '提交中...',
      mask: true
    })

    try {
      const logourl = await this.uploadIfNeeded('logo', 'Logo')
      const appphotourl = await this.uploadIfNeeded('background', '背景')
      const region = this.data.region || []
      const res = await network.xgwCommunityCreate({
        logourl,
        appphotourl,
        provinceid: region[0] || '',
        cityid: region[1] || '',
        countyid: region[2] || '',
        address: this.data.address.trim(),
        name: this.data.name.trim(),
        profile: this.data.profile.trim(),
        type: this.data.typeId
      })
      wx.hideLoading()
      if (!res || res.code !== 0) {
        wx.showToast({
          title: getErrorMessage(res),
          icon: 'none'
        })
        return
      }
      wx.showToast({
        title: '创建成功',
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
