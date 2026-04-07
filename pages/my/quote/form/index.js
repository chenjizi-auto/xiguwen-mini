const network = require('../../../../api/network.js')

const MAX_IMAGES = 9

function asNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

function numberText(v) {
  return safeStr(v).replace(/[^\d.]/g, '')
}

function normalizePhotos(list) {
  if (!Array.isArray(list)) return []
  return list
    .map(item => (typeof item === 'string' ? item : safeStr(item && item.photo)))
    .filter(Boolean)
}

Page({
  data: {
    loading: false,
    saving: false,
    isEdit: false,
    quoteId: 0,
    form: {
      name: '',
      price: '',
      temporarypay: '',
      deductible: '',
      weigh: '',
      content: ''
    },
    photos: []
  },

  onLoad(options) {
    const quoteId = asNumber(options && options.id, 0)
    if (!quoteId) return
    this.setData({
      isEdit: true,
      quoteId
    })
    wx.setNavigationBarTitle({
      title: '编辑报价'
    })
    this.fetchDetail()
  },

  async fetchDetail() {
    this.setData({ loading: true })
    try {
      const res = await network.xgwQuoteDetail({ quotationid: this.data.quoteId })
      if (!res || res.code !== 0 || !res.data) {
        throw new Error((res && (res.msg || res.message)) || '加载失败')
      }
      const data = res.data || {}
      this.setData({
        loading: false,
        form: {
          name: safeStr(data.name),
          price: safeStr(data.price),
          temporarypay: safeStr(data.temporarypay),
          deductible: safeStr(data.deductible),
          weigh: safeStr(data.weigh),
          content: safeStr(data.content)
        },
        photos: normalizePhotos(data.imglist)
      })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({
        title: safeStr(err && err.message, '加载失败'),
        icon: 'none'
      })
    }
  },

  onInput(e) {
    const key = safeStr(e && e.currentTarget ? e.currentTarget.dataset.key : '')
    if (!key) return
    let value = safeStr(e && e.detail ? e.detail.value : '')
    if (['price', 'temporarypay', 'deductible', 'weigh'].includes(key)) {
      value = numberText(value)
    }
    this.setData({
      [`form.${key}`]: value
    })
  },

  choosePhotos() {
    const remain = Math.max(MAX_IMAGES - (this.data.photos || []).length, 0)
    if (!remain) {
      wx.showToast({ title: '最多上传9张', icon: 'none' })
      return
    }
    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const photos = (this.data.photos || []).concat(res.tempFilePaths || []).slice(0, MAX_IMAGES)
        this.setData({ photos })
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
      urls: this.data.photos || [url]
    })
  },

  validate() {
    const form = this.data.form || {}
    if (!safeStr(form.name).trim()) {
      wx.showToast({ title: '报价名称不能为空', icon: 'none' })
      return false
    }
    if (!safeStr(form.price).trim()) {
      wx.showToast({ title: '报价价格不能为空', icon: 'none' })
      return false
    }
    if (!safeStr(form.temporarypay).trim()) {
      wx.showToast({ title: '定金金额不能为空', icon: 'none' })
      return false
    }
    if (!safeStr(form.deductible).trim()) {
      wx.showToast({ title: '折扣金额不能为空', icon: 'none' })
      return false
    }
    if (!safeStr(form.weigh).trim()) {
      wx.showToast({ title: '排序不能为空', icon: 'none' })
      return false
    }
    return true
  },

  async uploadPhoto(filePath) {
    if (/^https?:\/\//i.test(filePath)) return filePath
    const res = await network.xgwUploadImage(filePath, 1)
    if (!res || res.code !== 0 || !res.data) {
      throw new Error((res && (res.msg || res.message)) || '图片上传失败')
    }
    return safeStr(res.data)
  },

  async onSave() {
    if (this.data.saving || !this.validate()) return
    this.setData({ saving: true })
    wx.showLoading({ title: '保存中...', mask: true })
    try {
      const uploaded = []
      const photos = this.data.photos || []
      for (let i = 0; i < photos.length; i += 1) {
        uploaded.push(await this.uploadPhoto(photos[i]))
      }
      const form = this.data.form || {}
      const payload = {
        coupons_price: safeStr(form.deductible).trim(),
        price: safeStr(form.price).trim(),
        shopimg: uploaded.join(','),
        shopname: safeStr(form.name).trim(),
        temporarypay: safeStr(form.temporarypay).trim(),
        weigh: safeStr(form.weigh).trim()
      }
      if (safeStr(form.content).trim()) {
        payload.miaoshu = safeStr(form.content).trim()
      }
      let res
      if (this.data.isEdit) {
        payload.quotationid = this.data.quoteId
        res = await network.xgwQuoteEdit(payload)
      } else {
        res = await network.xgwQuoteAdd(payload)
      }
      wx.hideLoading()
      if (!res || res.code !== 0) {
        throw new Error((res && (res.msg || res.message)) || '保存失败')
      }
      wx.showToast({
        title: this.data.isEdit ? '修改成功' : '添加成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 300)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: safeStr(err && err.message, '保存失败'),
        icon: 'none'
      })
    } finally {
      this.setData({ saving: false })
    }
  }
})
