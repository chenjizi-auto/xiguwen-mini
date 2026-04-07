const network = require('../../../../api/network.js')
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

function getErrorMessage(err, fallback = '保存失败，请稍后重试') {
  if (!err) return fallback
  if (typeof err === 'string') return err
  return err.message || err.errMsg || fallback
}

Page({
  data: {
    caseId: 0,
    pageTitle: '添加案例',
    title: '',
    weddingTime: '',
    weddingPlace: '',
    weddingExpenses: '',
    weight: '',
    description: '',
    cover: '',
    photoList: [],
    typeList: [],
    environmentList: [],
    selectedTypeId: 0,
    selectedTypeText: '',
    selectedEnvironmentId: 0,
    selectedEnvironmentText: '',
    saving: false,
    maxPhotoCount: MAX_PHOTO_COUNT,
    defaultCover: DEFAULT_COVER
  },

  async onLoad(options) {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    const caseId = asNumber(options && options.id, 0)
    const pageTitle = caseId ? '编辑案例' : '添加案例'
    this.setData({ caseId, pageTitle })
    wx.setNavigationBarTitle({ title: pageTitle })
    await this.fetchDictionaries()
    if (caseId) {
      this.fetchDetail(caseId)
    }
  },

  onTitleInput(e) {
    this.setData({
      title: safeText(e.detail.value).slice(0, 30)
    })
  },

  onWeddingTimeChange(e) {
    this.setData({
      weddingTime: safeText(e && e.detail ? e.detail.value : '')
    })
  },

  onWeddingPlaceInput(e) {
    this.setData({
      weddingPlace: safeText(e.detail.value).slice(0, 50)
    })
  },

  onWeddingExpensesInput(e) {
    const raw = safeText(e.detail.value)
    let value = raw.replace(/[^\d.]/g, '')
    const firstDot = value.indexOf('.')
    if (firstDot >= 0) {
      value = value.slice(0, firstDot + 1) + value.slice(firstDot + 1).replace(/\./g, '').slice(0, 2)
    }
    this.setData({
      weddingExpenses: value.slice(0, 10)
    })
  },

  onWeightInput(e) {
    const raw = safeText(e.detail.value)
    let value = raw.replace(/[^\d.]/g, '')
    const firstDot = value.indexOf('.')
    if (firstDot >= 0) {
      value = value.slice(0, firstDot + 1) + value.slice(firstDot + 1).replace(/\./g, '').slice(0, 2)
    }
    this.setData({
      weight: value.slice(0, 6)
    })
  },

  onDescriptionInput(e) {
    this.setData({
      description: safeText(e.detail.value).slice(0, 500)
    })
  },

  chooseCover() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const tempFilePaths = (res && res.tempFilePaths) || []
        if (!tempFilePaths.length) return
        this.setData({ cover: tempFilePaths[0] })
      }
    })
  },

  removeCover() {
    this.setData({ cover: '' })
  },

  choosePhotos() {
    const remain = MAX_PHOTO_COUNT - this.data.photoList.length
    if (remain <= 0) {
      wx.showToast({ title: `最多上传${MAX_PHOTO_COUNT}张`, icon: 'none' })
      return
    }
    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const tempFilePaths = (res && res.tempFilePaths) || []
        if (!tempFilePaths.length) return
        this.setData({
          photoList: this.data.photoList.concat(tempFilePaths).slice(0, MAX_PHOTO_COUNT)
        })
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

  previewCover() {
    if (!this.data.cover) return
    wx.previewImage({ current: this.data.cover, urls: [this.data.cover] })
  },

  previewPhoto(e) {
    const current = safeText(e.currentTarget.dataset.url)
    if (!current) return
    wx.previewImage({ current, urls: this.data.photoList })
  },

  chooseType() {
    const list = this.data.typeList || []
    if (!list.length) {
      wx.showToast({ title: '暂无婚礼类型', icon: 'none' })
      return
    }
    wx.showActionSheet({
      itemList: list.map(item => item.title),
      success: res => {
        const item = list[res.tapIndex]
        if (!item) return
        this.setData({
          selectedTypeId: item.id,
          selectedTypeText: item.title
        })
      }
    })
  },

  chooseEnvironment() {
    const list = this.data.environmentList || []
    if (!list.length) {
      wx.showToast({ title: '暂无婚礼环境', icon: 'none' })
      return
    }
    wx.showActionSheet({
      itemList: list.map(item => item.title),
      success: res => {
        const item = list[res.tapIndex]
        if (!item) return
        this.setData({
          selectedEnvironmentId: item.id,
          selectedEnvironmentText: item.title
        })
      }
    })
  },

  async onSave() {
    if (this.data.saving) return
    if (!this.validateForm()) return
    this.setData({ saving: true })
    try {
      const payload = await this.prepareSubmitPayload()
      wx.showLoading({ title: '保存中...', mask: true })
      const res = this.data.caseId
        ? await network.xgwCaseEdit(Object.assign({}, payload, { id: this.data.caseId }))
        : await network.xgwCaseAdd(payload)
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

  validateForm() {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请输入案例名称', icon: 'none' })
      return false
    }
    if (!this.data.weddingTime) {
      wx.showToast({ title: '请选择婚礼日期', icon: 'none' })
      return false
    }
    if (!this.data.weddingPlace.trim()) {
      wx.showToast({ title: '请输入婚礼地点', icon: 'none' })
      return false
    }
    if (!this.data.weddingExpenses.trim()) {
      wx.showToast({ title: '请输入婚礼费用', icon: 'none' })
      return false
    }
    if (!Number.isFinite(Number(this.data.weddingExpenses))) {
      wx.showToast({ title: '婚礼费用格式有误', icon: 'none' })
      return false
    }
    if (!this.data.selectedTypeId) {
      wx.showToast({ title: '请选择婚礼类型', icon: 'none' })
      return false
    }
    if (!this.data.selectedEnvironmentId) {
      wx.showToast({ title: '请选择婚礼环境', icon: 'none' })
      return false
    }
    if (!this.data.weight.trim()) {
      wx.showToast({ title: '请输入排序', icon: 'none' })
      return false
    }
    if (!Number.isFinite(Number(this.data.weight))) {
      wx.showToast({ title: '排序格式有误', icon: 'none' })
      return false
    }
    if (!this.data.cover) {
      wx.showToast({ title: '请设置案例封面', icon: 'none' })
      return false
    }
    if (!this.data.description.trim()) {
      wx.showToast({ title: '请输入案例描述', icon: 'none' })
      return false
    }
    if (!this.data.photoList.length) {
      wx.showToast({ title: '请上传案例图片', icon: 'none' })
      return false
    }
    return true
  },

  async prepareSubmitPayload() {
    const uploadQueue = []
    if (this.data.cover && !isRemotePath(this.data.cover)) {
      uploadQueue.push(this.data.cover)
    }
    this.data.photoList.forEach(item => {
      if (item && !isRemotePath(item)) uploadQueue.push(item)
    })

    let uploadedCount = 0
    const uploadOne = async filePath => {
      if (!filePath || isRemotePath(filePath)) return filePath
      uploadedCount += 1
      wx.showLoading({ title: `上传中 ${uploadedCount}/${uploadQueue.length}`, mask: true })
      const res = await network.xgwUploadImage(filePath, 1)
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && (res.message || res.msg)) || '图片上传失败')
      }
      return res.data
    }

    const cover = await uploadOne(this.data.cover)
    const photourl = []
    for (let i = 0; i < this.data.photoList.length; i += 1) {
      photourl.push(await uploadOne(this.data.photoList[i]))
    }

    return {
      title: this.data.title.trim(),
      photourl,
      weddingcover: cover,
      weddingdescribe: this.data.description.trim(),
      weddingenvironmentid: this.data.selectedEnvironmentId,
      weddingexpenses: this.data.weddingExpenses.trim(),
      weddingplace: this.data.weddingPlace.trim(),
      weddingtime: this.data.weddingTime,
      weddingtypeid: this.data.selectedTypeId,
      weigh: this.data.weight.trim()
    }
  },

  async fetchDictionaries() {
    try {
      const [typeRes, envRes] = await Promise.all([
        network.xgwWeddingTypeList({}),
        network.xgwWeddingEnvironmentList({})
      ])
      this.setData({
        typeList: Array.isArray(typeRes && typeRes.data) ? typeRes.data.map(item => ({
          id: asNumber(item.id, 0),
          title: safeText(item.title)
        })) : [],
        environmentList: Array.isArray(envRes && envRes.data) ? envRes.data.map(item => ({
          id: asNumber(item.id, 0),
          title: safeText(item.title)
        })) : []
      })
    } catch (err) {
      wx.showToast({ title: '案例字典加载失败', icon: 'none' })
    }
  },

  async fetchDetail(caseId) {
    wx.showLoading({ title: '加载中...', mask: true })
    try {
      const res = await network.xgwCaseDetail({ id: caseId })
      wx.hideLoading()
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && (res.message || res.msg)) || '加载案例失败')
      }
      const data = res.data || {}
      const photoList = Array.isArray(data.phtupian)
        ? data.phtupian.map(item => safeText(item && item.photourl)).filter(Boolean)
        : []
      const type = (this.data.typeList || []).find(item => item.id === asNumber(data.weddingtypeid, 0))
      const environment = (this.data.environmentList || []).find(item => item.id === asNumber(data.weddingenvironmentid, 0))
      this.setData({
        title: safeText(data.title),
        weddingTime: safeText(data.weddingtime),
        weddingPlace: safeText(data.weddingplace),
        weddingExpenses: safeText(data.weddingexpenses),
        weight: safeText(data.weigh),
        description: safeText(data.weddingdescribe),
        cover: safeText(data.weddingcover),
        photoList,
        selectedTypeId: type ? type.id : asNumber(data.weddingtypeid, 0),
        selectedTypeText: type ? type.title : '',
        selectedEnvironmentId: environment ? environment.id : asNumber(data.weddingenvironmentid, 0),
        selectedEnvironmentText: environment ? environment.title : ''
      })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: getErrorMessage(err, '加载案例失败'), icon: 'none' })
    }
  }
})
