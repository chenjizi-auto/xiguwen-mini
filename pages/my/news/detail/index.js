function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

Page({
  data: {
    url: '',
    html: '',
    isWebUrl: false,
    title: '新闻详情',
    image: ''
  },

  onLoad(options) {
    const rawContent = decodeURIComponent(safeStr(options && options.url))
    const title = decodeURIComponent(safeStr(options && options.title, '新闻详情'))
    const image = decodeURIComponent(safeStr(options && options.image))
    const isWebUrl = /^https?:\/\//i.test(rawContent)
    this.setData({
      url: isWebUrl ? rawContent : '',
      html: isWebUrl ? '' : rawContent,
      isWebUrl,
      title,
      image
    })
    wx.setNavigationBarTitle({
      title
    })
    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  onShareAppMessage() {
    return {
      title: this.data.title || '婚礼新闻',
      path:
        `/pages/my/news/detail/index?url=${encodeURIComponent(this.data.isWebUrl ? this.data.url : this.data.html)}` +
        `&title=${encodeURIComponent(this.data.title)}` +
        `&image=${encodeURIComponent(this.data.image || '')}`,
      imageUrl: this.data.image || undefined
    }
  },

  onShareTimeline() {
    return {
      title: this.data.title || '婚礼新闻',
      query:
        `url=${encodeURIComponent(this.data.isWebUrl ? this.data.url : this.data.html)}` +
        `&title=${encodeURIComponent(this.data.title)}` +
        `&image=${encodeURIComponent(this.data.image || '')}`,
      imageUrl: this.data.image || undefined
    }
  }
})
