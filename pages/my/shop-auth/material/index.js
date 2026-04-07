const network = require('../../../../api/network.js')

function asNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

Page({
  data: {
    id: 0,
    mode: 'submit',
    title: '提交资料',
    loading: true,
    saving: false,
    videoUrl: '',
    photos: []
  },

  onLoad(options) {
    const id = asNumber(options && options.id, 0)
    const mode = safeStr(options && options.mode, 'submit')
    const title = decodeURIComponent(safeStr(options && options.title, '提交资料'))
    this.setData({
      id,
      mode,
      title
    })
    wx.setNavigationBarTitle({
      title
    })
    if (mode === 'watch' || mode === 'resubmit') {
      this.fetchDetail()
      return
    }
    this.setData({ loading: false })
  },

  onVideoInput(e) {
    if (this.data.mode === 'watch') return
    this.setData({
      videoUrl: safeStr(e && e.detail ? e.detail.value : '')
    })
  },

  choosePhotos() {
    if (this.data.mode === 'watch') return
    const remain = Math.max(9 - (this.data.photos || []).length, 0)
    if (!remain) {
      wx.showToast({ title: '最多上传9张', icon: 'none' })
      return
    }
    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const list = (this.data.photos || []).concat(res.tempFilePaths || []).slice(0, 9)
        this.setData({ photos: list })
      }
    })
  },

  removePhoto(e) {
    if (this.data.mode === 'watch') return
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
      urls: this.data.photos || [url]
    })
  },

  async fetchDetail() {
    this.setData({ loading: true })
    try {
      const res = await network.xgwShopAuthSubmitInfo({ id: this.data.id })
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && (res.msg || res.message)) || '加载失败')
      }
      const data = res.data || {}
      this.did = asNumber(data.did, 0)
      this.setData({
        loading: false,
        videoUrl: safeStr(data.video_url),
        photos: Array.isArray(data.r_data) ? data.r_data.filter(Boolean) : []
      })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({
        title: safeStr(err && err.message, '加载失败'),
        icon: 'none'
      })
    }
  },

  async uploadPhoto(filePath) {
    if (/^https?:\/\//i.test(filePath)) return filePath
    const res = await network.xgwUploadImage(filePath, 1)
    if (!res || res.code !== 0 || !res.data) {
      throw new Error((res && (res.msg || res.message)) || '图片上传失败')
    }
    return safeStr(res.data)
  },

  async onSubmit() {
    if (this.data.mode === 'watch' || this.data.saving) return
    const videoUrl = safeStr(this.data.videoUrl).trim()
    if (!videoUrl) {
      wx.showToast({ title: '请输入信息', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    wx.showLoading({ title: '提交中...', mask: true })
    try {
      const uploaded = []
      const photos = this.data.photos || []
      for (let i = 0; i < photos.length; i += 1) {
        uploaded.push(await this.uploadPhoto(photos[i]))
      }
      const payload =
        this.data.mode === 'resubmit'
          ? { did: this.did, id: this.data.id, photo: uploaded.join(','), video: videoUrl }
          : { id: this.data.id, photo: uploaded.join(','), video: videoUrl }
      const request = this.data.mode === 'resubmit' ? network.xgwShopAuthResubmit : network.xgwShopAuthSubmit
      const res = await request(payload)
      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error((res && (res.msg || res.message)) || '提交失败')
      }
      wx.showToast({
        title: '提交成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 300)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: safeStr(err && err.message, '提交失败'),
        icon: 'none'
      })
    } finally {
      this.setData({ saving: false })
    }
  }
})
