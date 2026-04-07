const network = require('../../api/network.js')

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
    loading: true,
    errorText: '',
    detail: null,
    score: 5,
    content: '',
    anonymous: false,
    fileList: [],
    uploadedImages: []
  },

  onLoad(options) {
    const id = asNumber(options && options.id, 0)
    this.setData({ id })
    this.loadDetail()
  },

  async loadDetail() {
    this.setData({
      loading: true,
      errorText: ''
    })
    try {
      const res = await network.weddingOrderDetail({ id: this.data.id })
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && res.msg) || 'request failed')
      }
      this.setData({
        loading: false,
        detail: res.data
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: '评价信息加载失败，请稍后重试'
      })
    }
  },

  onScoreChange(e) {
    this.setData({
      score: asNumber(e && e.detail, 5)
    })
  },

  onContentInput(e) {
    this.setData({
      content: safeStr(e && e.detail ? e.detail.value : '')
    })
  },

  onAnonymousChange(e) {
    this.setData({
      anonymous: !!(e && e.detail)
    })
  },

  async afterRead(e) {
    const files = Array.isArray(e.detail.file) ? e.detail.file : [e.detail.file]
    if (!files.length) return
    if ((this.data.fileList || []).length + files.length > 9) {
      wx.showToast({
        title: '最多上传9张图片',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '上传中', mask: true })
    try {
      const uploaded = (this.data.uploadedImages || []).slice()
      const fileList = (this.data.fileList || []).slice()

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i]
        const uploadRes = await network.xgwUploadImage(file.url, 1)
        if (!uploadRes || uploadRes.code !== 0 || !uploadRes.data) {
          throw new Error((uploadRes && uploadRes.msg) || '图片上传失败')
        }
        uploaded.push(uploadRes.data)
        fileList.push(file)
      }

      this.setData({
        uploadedImages: uploaded,
        fileList
      })
    } catch (err) {
      wx.showToast({
        title: err && err.message ? err.message : '图片上传失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  onDeleteImage(e) {
    const index = asNumber(e && e.detail ? e.detail.index : -1, -1)
    if (index < 0) return
    const fileList = (this.data.fileList || []).slice()
    const uploadedImages = (this.data.uploadedImages || []).slice()
    fileList.splice(index, 1)
    uploadedImages.splice(index, 1)
    this.setData({
      fileList,
      uploadedImages
    })
  },

  async onSubmit() {
    const content = safeStr(this.data.content).trim()
    if (!content || this.data.score <= 0) {
      wx.showToast({
        title: '完善评价再发布哦',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '发布中', mask: true })
    try {
      const res = await network.weddingEvaluate({
        anonymous: this.data.anonymous ? 2 : 1,
        content,
        id: this.data.id,
        pictures: (this.data.uploadedImages || []).join(','),
        score: this.data.score
      })
      if (!res || res.code !== 0) {
        throw new Error((res && res.msg) || '发布失败')
      }
      wx.showToast({
        title: res.msg || '发布成功',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 600)
    } catch (err) {
      wx.showToast({
        title: err && err.message ? err.message : '发布失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  }
})
