const network = require('../../../../api/network.js')
const xgwAuth = require('../../../../utils/xgw-auth.js')

const DEFAULT_COVER = '/images/load_img.webp'

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
    videoId: 0,
    pageTitle: '添加视频',
    title: '',
    weight: '',
    mode: 'link',
    videoUrl: '',
    localVideoPath: '',
    localVideoName: '',
    cover: '',
    saving: false,
    defaultCover: DEFAULT_COVER
  },

  onLoad(options) {
    if (!xgwAuth.isLogined()) {
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    const videoId = asNumber(options && options.id, 0)
    const pageTitle = videoId ? '编辑视频' : '添加视频'
    this.setData({ videoId, pageTitle })
    wx.setNavigationBarTitle({ title: pageTitle })
    if (videoId) {
      this.fetchDetail(videoId)
    }
  },

  onTitleInput(e) {
    this.setData({
      title: safeText(e.detail.value).slice(0, 30)
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

  onModeChange(e) {
    const mode = safeText(e.currentTarget.dataset.mode, 'link')
    if (!mode || mode === this.data.mode) return
    this.setData({
      mode,
      localVideoPath: mode === 'link' ? '' : this.data.localVideoPath,
      localVideoName: mode === 'link' ? '' : this.data.localVideoName
    })
  },

  onVideoUrlInput(e) {
    this.setData({
      videoUrl: safeText(e.detail.value).trim()
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
    this.setData({ cover: '' })
  },

  chooseVideo() {
    wx.chooseVideo({
      sourceType: ['album', 'camera'],
      compressed: true,
      maxDuration: 60,
      success: res => {
        this.setData({
          localVideoPath: safeText(res && res.tempFilePath),
          localVideoName: safeText(res && res.tempFilePath).split('/').pop() || '已选择视频'
        })
      }
    })
  },

  removeVideo() {
    this.setData({
      localVideoPath: '',
      localVideoName: ''
    })
  },

  previewCover() {
    if (!this.data.cover) return
    wx.previewImage({
      current: this.data.cover,
      urls: [this.data.cover]
    })
  },

  async onSave() {
    if (this.data.saving) return
    if (!this.validateForm()) return
    this.setData({ saving: true })
    try {
      const payload = await this.prepareSubmitPayload()
      wx.showLoading({ title: '保存中...', mask: true })
      const res = this.data.videoId
        ? await network.xgwVideoEdit(Object.assign({}, payload, { id: this.data.videoId }))
        : await network.xgwVideoAdd(payload)
      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error((res && (res.message || res.msg)) || '保存失败')
      }
      wx.showToast({ title: (res && (res.message || res.msg)) || '保存成功', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 300)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: getErrorMessage(err, '保存失败'), icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },

  validateForm() {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请输入视频名称', icon: 'none' })
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
    if (this.data.mode === 'link') {
      if (!this.data.videoUrl.trim()) {
        wx.showToast({ title: '请输入视频链接', icon: 'none' })
        return false
      }
      if (!/^https?:\/\//i.test(this.data.videoUrl.trim())) {
        wx.showToast({ title: '请输入正确的视频链接', icon: 'none' })
        return false
      }
    } else {
      if (!this.data.localVideoPath) {
        wx.showToast({ title: '请选择视频文件', icon: 'none' })
        return false
      }
      if (!this.data.cover) {
        wx.showToast({ title: '请设置视频封面', icon: 'none' })
        return false
      }
    }
    return true
  },

  async prepareSubmitPayload() {
    let cover = this.data.cover
    if (cover && !isRemotePath(cover)) {
      wx.showLoading({ title: '上传封面中...', mask: true })
      const coverRes = await network.xgwUploadImage(cover, 1)
      if (!coverRes || coverRes.code !== 0 || !coverRes.data) {
        throw new Error((coverRes && (coverRes.message || coverRes.msg)) || '封面上传失败')
      }
      cover = coverRes.data
    }

    let videoUrl = this.data.videoUrl.trim()
    if (this.data.mode === 'video') {
      if (isRemotePath(this.data.localVideoPath)) {
        videoUrl = this.data.localVideoPath
      } else {
        wx.showLoading({ title: '上传视频中...', mask: true })
        const videoRes = await network.xgwUploadVideo(this.data.localVideoPath)
        if (!videoRes || videoRes.code !== 0 || !videoRes.data) {
          throw new Error((videoRes && (videoRes.message || videoRes.msg)) || '视频上传失败')
        }
        videoUrl = videoRes.data
      }
    }

    return {
      cover,
      title: this.data.title.trim(),
      video_url: videoUrl,
      weigh: Number(this.data.weight.trim())
    }
  },

  async fetchDetail(videoId) {
    wx.showLoading({ title: '加载中...', mask: true })
    try {
      const res = await network.xgwVideoDetail({ id: videoId })
      wx.hideLoading()
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && (res.message || res.msg)) || '加载视频失败')
      }
      const data = res.data || {}
      const videoUrl = safeText(data.video_url)
      this.setData({
        title: safeText(data.title),
        weight: safeText(data.weigh),
        mode: 'link',
        videoUrl,
        localVideoPath: videoUrl,
        localVideoName: videoUrl ? '当前已保存视频' : '',
        cover: safeText(data.cover)
      })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: getErrorMessage(err, '加载视频失败'), icon: 'none' })
    }
  }
})
