const WXAPI = require('apifm-wxapi')
const CONFIG = require('../../config')

const PAGE_META = {
  aboutus: {
    navTitle: '关于我们',
    fallbackTitle: '关于我们'
  },
  yhxy: {
    navTitle: '用户协议',
    fallbackTitle: '用户协议'
  },
  ysxy: {
    navTitle: '隐私政策',
    fallbackTitle: '隐私政策'
  }
}

Page({
  data: {
    loading: true,
    key: 'aboutus',
    fallbackTitle: '关于我们',
    appName: '喜顾问',
    versionText: `V ${CONFIG.version}`,
    logo: '/images/login-app-icon.webp',
    fallbackPhone: '13880700685',
    wechatName: '喜顾问',
    showAboutPanel: true
  },
  onLoad: function (options) {
    const key = (options && options.key) || 'aboutus'
    const pageMeta = PAGE_META[key] || PAGE_META.aboutus
    this.setData({
      key,
      fallbackTitle: pageMeta.fallbackTitle,
      showAboutPanel: key === 'aboutus'
    })
    wx.setNavigationBarTitle({
      title: pageMeta.navTitle
    })
    this.cmsPage()
  },
  onShow: function () {

  },
  async cmsPage() {
    try {
      const res = await WXAPI.cmsPage(this.data.key)
      if (res.code == 0 && res.data && res.data.info) {
        this.setData({
          cmsPageDetail: res.data,
          loading: false
        })
        wx.setNavigationBarTitle({
          title: res.data.info.title || this.data.fallbackTitle,
        })
        return
      }
    } catch (err) {}
    this.setData({
      loading: false
    })
    wx.setNavigationBarTitle({
      title: this.data.fallbackTitle,
    })
  },
  makePhoneCall() {
    wx.makePhoneCall({
      phoneNumber: this.data.fallbackPhone
    })
  },
  openUserAgreement() {
    wx.navigateTo({
      url: '/pages/about/index?key=yhxy'
    })
  },
  openPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/about/index?key=ysxy'
    })
  },
  copyPhone() {
    wx.setClipboardData({
      data: this.data.fallbackPhone
    })
  },
  contactNow() {
    this.makePhoneCall()
  },
  checkVersion() {
    wx.showToast({
      title: `当前版本 ${CONFIG.version}`,
      icon: 'none'
    })
  },
  onShareAppMessage() {
    return {
      title: '喜顾问',
      path: '/pages/start/start'
    }
  }
})
