const network = require('../../../api/network.js')
const xgwAuth = require('../../../utils/xgw-auth.js')

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
    atlasId: 0,
    pageTitle: '添加图册',
    name: '',
    weight: '',
    description: '',
    cover: '',
    photoList: [],
    saving: false,
    maxPhotoCount: MAX_PHOTO_COUNT,
    defaultCover: DEFAULT_COVER
  },

  onLoad(options) {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    const atlasId = asNumber(options && options.id, 0)
    this.setData({
      atlasId,
      pageTitle: atlasId ? '编辑图册' : '添加图册'
    })
    wx.setNavigationBarTitle({
      title: atlasId ? '编辑图册' : '添加图册'
    })
    if (atlasId) {
      this.fetchDetail(atlasId)
    }
  },

  onNameInput(e) {
    this.setData({
      name: safeText(e.detail.value).slice(0, 30)
    })
  },

  onWeightInput(e) {
    const raw = safeText(e.detail.value)
    let value = raw.replace(/[^\d.]/g, '')
    const firstDot = value.indexOf('.')
    if (firstDot >= 0) {
      value =
        value.slice(0, firstDot + 1) +
        value
          .slice(firstDot + 1)
          .replace(/\./g, '')
          .slice(0, 2)
    }
    this.setData({
      weight: value.slice(0, 6)
    })
  },

  onDescriptionInput(e) {
    this.setData({
      description: safeText(e.detail.value).slice(0, 300)
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
        this.setData({
          cover: tempFilePaths[0]
        })
      }
    })
  },

  removeCover() {
    this.setData({
      cover: ''
    })
  },

  choosePhotos() {
    const remain = MAX_PHOTO_COUNT - this.data.photoList.length
    if (remain <= 0) {
      wx.showToast({
        title: `最多上传${MAX_PHOTO_COUNT}张`,
        icon: 'none'
      })
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
    wx.previewImage({
      current: this.data.cover,
      urls: [this.data.cover]
    })
  },

  previewPhoto(e) {
    const current = safeText(e.currentTarget.dataset.url)
    if (!current) return
    wx.previewImage({
      current,
      urls: this.data.photoList
    })
  },

  async onSave() {
    if (this.data.saving) return
    if (!this.validateForm()) return

    this.setData({ saving: true })

    try {
      const payload = await this.prepareSubmitPayload()
      wx.showLoading({
        title: '保存中...',
        mask: true
      })

      const res = this.data.atlasId
        ? await network.xgwAtlasEdit(
            Object.assign({}, payload, {
              id: this.data.atlasId
            })
          )
        : await network.xgwAtlasAdd(payload)

      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '保存失败')
      }

      wx.showToast({
        title: (res && (res.message || res.msg)) || '保存成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 300)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: getErrorMessage(err, '保存失败'),
        icon: 'none'
      })
    } finally {
      this.setData({ saving: false })
    }
  },

  validateForm() {
    if (!this.data.name.trim()) {
      wx.showToast({
        title: '图册名称不能为空',
        icon: 'none'
      })
      return false
    }
    if (!this.data.weight.trim()) {
      wx.showToast({
        title: '排序不能为空',
        icon: 'none'
      })
      return false
    }
    if (!Number.isFinite(Number(this.data.weight))) {
      wx.showToast({
        title: '排序格式有误',
        icon: 'none'
      })
      return false
    }
    if (!this.data.description.trim()) {
      wx.showToast({
        title: '图册描述不能为空',
        icon: 'none'
      })
      return false
    }
    if (!this.data.cover) {
      wx.showToast({
        title: '请设置图册封面',
        icon: 'none'
      })
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
      if (item && !isRemotePath(item)) {
        uploadQueue.push(item)
      }
    })

    let uploadedCount = 0
    const uploadOne = async filePath => {
      if (!filePath || isRemotePath(filePath)) {
        return filePath
      }
      uploadedCount += 1
      wx.showLoading({
        title: `上传中 ${uploadedCount}/${uploadQueue.length}`,
        mask: true
      })
      const res = await network.xgwUploadImage(filePath, 1)
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && (res.message || res.msg)) || '图片上传失败')
      }
      return res.data
    }

    const cover = await uploadOne(this.data.cover)
    const photoList = []
    for (let i = 0; i < this.data.photoList.length; i += 1) {
      photoList.push(await uploadOne(this.data.photoList[i]))
    }

    return {
      cover,
      name: this.data.name.trim(),
      photo: photoList,
      synopsis: this.data.description.trim(),
      weight: this.data.weight.trim()
    }
  },

  async fetchDetail(atlasId) {
    wx.showLoading({
      title: '加载中...',
      mask: true
    })
    try {
      const res = await network.xgwAtlasDetail({ id: atlasId })
      wx.hideLoading()
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && (res.message || res.msg)) || '加载图册失败')
      }
      const data = res.data || {}
      const photoList = Array.isArray(data.photourl)
        ? data.photourl.map(item => safeText(item && item.photo)).filter(Boolean)
        : []
      this.setData({
        name: safeText(data.name),
        weight: safeText(data.weight),
        description: safeText(data.synopsis),
        cover: safeText(data.cover),
        photoList
      })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: getErrorMessage(err, '加载图册失败'),
        icon: 'none'
      })
    }
  }
})
