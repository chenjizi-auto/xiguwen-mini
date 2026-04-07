const network = require('../../api/network.js')

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function getErrorMessage(res, fallback = '加载失败，请稍后重试') {
  if (!res) return fallback
  return res.message || res.msg || fallback
}

function formatRole(value) {
  const role = asNumber(value, 0)
  if (role === 1) return '创始人'
  if (role === 2) return '管理员'
  if (role === 3) return '成员'
  return ''
}

function normalizeImageList(list) {
  if (!Array.isArray(list)) return []
  return list
    .map(item => safeText(item && (item.photourl || item.url || item.src)))
    .filter(Boolean)
}

Page({
  data: {
    id: '',
    from: '',
    loading: true,
    errorText: '',
    detail: null
  },

  onLoad(options) {
    const id = safeText(options && options.id)
    this.setData({
      id,
      from: safeText(options && options.from)
    })
    wx.setNavigationBarTitle({
      title: '社团详情'
    })
    if (!id) {
      this.setData({
        loading: false,
        errorText: '社团参数有误'
      })
      return
    }
    this.fetchDetail()
  },

  onPullDownRefresh() {
    this.fetchDetail().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  async fetchDetail() {
    this.setData({
      loading: true,
      errorText: ''
    })
    try {
      const res = await network.xgwCommunityDetail({
        id: this.data.id,
        p: 1,
        row: 30
      })
      if (!res || res.code !== 0 || !res.data || !res.data.info) {
        throw new Error(getErrorMessage(res))
      }
      const info = res.data.info
      const dynamicList = Array.isArray(res.data.dynamiclist) ? res.data.dynamiclist : []
      this.setData({
        loading: false,
        detail: {
          id: safeText(info.id),
          name: safeText(info.name, '--'),
          type: safeText(info.occupationid || info.type, ''),
          roleText: formatRole(info.jiaose),
          address: safeText(info.address || info.dizhi, '未设置地区'),
          profile: safeText(info.profile, '暂无社团简介'),
          logo: safeText(info.logourl),
          cover: safeText(info.appphotourl),
          memberCount: safeText(info.membersnum || info.chengyuan, '0'),
          browseCount: safeText(info.clicked, '0'),
          username: safeText(info.username),
          dynamicCount: safeText(res.data.quanbudongtai, dynamicList.length),
          dynamicList: dynamicList.map(item => ({
            id: safeText(item.id),
            avatar: safeText(item.head),
            nickname: safeText(item.nickname, '社团成员'),
            occupation: safeText(item.occupationid || item.association),
            content: safeText(item.content, ''),
            createTime: safeText(item.create_ti, ''),
            pv: safeText(item.pv, '0'),
            zan: safeText(item.zan, '0'),
            commentCount: safeText(item.pls, '0'),
            images: normalizeImageList(item.pics)
          }))
        }
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '加载失败，请稍后重试',
        detail: null
      })
    }
  },

  onPreviewImage(e) {
    const current = safeText(e.currentTarget.dataset.current)
    const images = e.currentTarget.dataset.images || []
    if (!current || !Array.isArray(images) || images.length === 0) return
    wx.previewImage({
      current,
      urls: images
    })
  }
})
