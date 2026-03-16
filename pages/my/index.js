const WXAPI = require('apifm-wxapi')
const AUTH = require('../../utils/auth')
const TOOLS = require('../../utils/tools.js')
const network = require('../../api/network.js')

function asNumber(v, def = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function safeStr(v, def = '') {
  if (v == null) return def
  return String(v)
}

function buildOrderLists() {
  return {
    weddingOrderItems: [
      { id: 0, title: '全部订单', icon: '/images/mine/icon_mine_order_all.png' },
      { id: 1, title: '待付款', icon: '/images/mine/icon_mine_order_daifukuan.png' },
      { id: 2, title: '待接单', icon: '/images/mine/icon_mine_order_daijiedan.png' },
      { id: 3, title: '待服务', icon: '/images/mine/icon_mine_order_daifuwu.png' },
      { id: 4, title: '待评价', icon: '/images/mine/icon_mine_order_daipingjia.png' }
    ],
    mallOrderItems: [
      { id: 0, title: '全部订单', icon: '/images/mine/icon_mine_order_mall_all.png', badge: '' },
      { id: 1, title: '待付款', icon: '/images/mine/icon_mine_order_mall_daifukuan.png', badge: '' },
      { id: 2, title: '待发货', icon: '/images/mine/icon_mine_order_mall_daifahuo.png', badge: '' },
      { id: 3, title: '待收货', icon: '/images/mine/icon_mine_order_mall_daishouhuo.png', badge: '' },
      { id: 4, title: '待评价', icon: '/images/mine/icon_mine_order_mall_daipingjia.png', badge: '' }
    ],
    weddingJiedanItems: [
      { id: 0, title: '全部订单', icon: '/images/mine/icon_mine_jiedan_all.png' },
      { id: 1, title: '待付款', icon: '/images/mine/icon_mine_jiedan_daifukuan.png' },
      { id: 2, title: '待接单', icon: '/images/mine/icon_mine_jiedan_daijiedan.png' },
      { id: 3, title: '待服务', icon: '/images/mine/icon_mine_jiedan_daifuwu.png' },
      { id: 4, title: '待评价', icon: '/images/mine/icon_mine_jiedan_daipingjia.png' }
    ],
    mallJiedanItems: [
      { id: 0, title: '全部订单', icon: '/images/mine/icon_mine_jiedan_mall_all.png' },
      { id: 1, title: '待付款', icon: '/images/mine/icon_mine_jiedan_mall_daifukuan.png' },
      { id: 2, title: '待发货', icon: '/images/mine/icon_mine_jiedan_mall_daifahuo.png' },
      { id: 3, title: '待收货', icon: '/images/mine/icon_mine_jiedan_mall_daishouhuo.png' },
      { id: 4, title: '待评价', icon: '/images/mine/icon_mine_jiedan_mall_daipingjia.png' }
    ]
  }
}

function buildUserTools() {
  return [
    { id: 0, title: '发布需求', icon: '/images/mine/fabuxuqiu_icon.png' },
    { id: 1, title: '黄道吉日', icon: '/images/mine/huangdaojiri_icon.png' },
    { id: 2, title: '电子请柬', icon: '/images/mine/dianziqingjian_icon.png' },
    { id: 3, title: '日程安排', icon: '/images/mine/richeng_icon.png' },
    { id: 4, title: '婚礼宝典', icon: '/images/mine/fayangao_icon.png' },
    { id: 5, title: '婚礼流程', icon: '/images/mine/hunliliuchen_icon.png' },
    { id: 6, title: '记账助手', icon: '/images/mine/jizhangzhushou_icon.png' },
    { id: 7, title: '婚姻登记处', icon: '/images/mine/hunyindengjichu_icon.png' }
  ]
}

function buildOtherToolsByUserType(userType) {
  // 对齐 Android：setToolsMall / setToolsWedding / setTools
  const base = [
    { id: 0, title: '实名认证', icon: '/images/mine/shimingrenzheng_icon.png' },
    { id: 1, title: '我的需求', icon: '/images/mine/wodexuqiu_icon.png' }
  ]
  if (userType !== 3) {
    base.push({ id: 2, title: '我的社团', icon: '/images/mine/wodeshetuan_icon.png' })
  }
  base.push({ id: 3, title: '我的邀请', icon: '/images/mine/wodeyaoqing.png' })
  base.push({ id: 6, title: '婚礼新闻', icon: '/images/mine/hunlixinwen_icon.png' })
  base.push({ id: 8, title: '活动投票', icon: '/images/mine/huodong_toupiao_icon.png' })
  return base
}

function buildShopManageByUserType(userType) {
  // 对齐 Android：setDianpuManagerMall / setDianpuManagerWedding / setDianpuManager
  if (userType === 1) {
    return [
      { id: 0, title: '店铺信息', icon: '/images/mine/dianpuxinxi_icon.png' },
      { id: 1, title: '我的认证', icon: '/images/mine/dianpurenzheng_icon.png' },
      { id: 4, title: '我的商品', icon: '/images/mine/wodeshangpin_icon.png' },
      { id: 9, title: '推荐团队', icon: '/images/mine/tuijiantuandui_icon.png' },
      { id: 10, title: '查看需求', icon: '/images/mine/icon_jizhang.png' },
      { id: 12, title: '店铺主页', icon: '/images/mine/dianpuzhuye_icon.png' }
    ]
  }
  if (userType === 2) {
    return [
      { id: 0, title: '店铺信息', icon: '/images/mine/dianpuxinxi_icon.png' },
      { id: 1, title: '我的认证', icon: '/images/mine/dianpurenzheng_icon.png' },
      { id: 2, title: '发布档期', icon: '/images/mine/wodedangqi_icon.png' },
      { id: 3, title: '发布报价', icon: '/images/mine/wodebaojia_icon.png' },
      { id: 5, title: '上传图片', icon: '/images/mine/wodetuce_icon.png' },
      { id: 6, title: '上传视频', icon: '/images/mine/wodeshiping_icon.png' },
      { id: 7, title: '上传案例', icon: '/images/mine/wodeanli_icon.png' },
      { id: 8, title: '服务城市', icon: '/images/mine/fuwuchengshi_icon.png' },
      { id: 9, title: '推荐团队', icon: '/images/mine/tuijiantuandui_icon.png' },
      { id: 10, title: '婚礼宝典', icon: '/images/mine/fayangao_icon.png' },
      { id: 12, title: '店铺主页', icon: '/images/mine/dianpuzhuye_icon.png' }
    ]
  }
  return []
}

Page({
  data: {
    load_img: '/images/load_img.png',
    load_img_erro: '/images/load_img_erro.png',
    defaultAvatar: '/images/default.png',

    user: {},
    userType: 3,

    showWeddingShopJiedan: false,
    showMallShopJiedan: false,
    showShopManage: false,
    showMallVip: false,
    showUserVip: true,
    showPostShop: true,

    // mall order statistics badge (apifm)
    count_id_no_confirm: 0,
    count_id_no_pay: 0,
    count_id_no_reputation: 0,
    count_id_no_transfer: 0,

    weddingOrderItems: [],
    mallOrderItems: [],
    weddingJiedanItems: [],
    mallJiedanItems: [],
    otherToolsItems: [],
    shopManageItems: [],
    userToolsItems: []
  },

  onLoad() {
    const lists = buildOrderLists()
    this.setData({
      weddingOrderItems: lists.weddingOrderItems,
      mallOrderItems: lists.mallOrderItems,
      weddingJiedanItems: lists.weddingJiedanItems,
      mallJiedanItems: lists.mallJiedanItems,
      userToolsItems: buildUserTools()
    })
    this.applyUserType(3)
  },

  onShow() {
    this.loadMineHome()
    this.refreshMallOrderBadges()
    this.loadMallOrderStatistics()
    TOOLS.showTabBarBadge()
  },

  onAvatarError() {
    this.setData({
      'user.head': this.data.load_img_erro
    })
  },

  goSetting() {
    const token = wx.getStorageSync('token')
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/my/setting' })
  },

  onProfileTap() {
    wx.navigateTo({ url: '/pages/my/info-menu' })
  },

  onStatTap(e) {
    const type = e && e.currentTarget ? safeStr(e.currentTarget.dataset.type) : ''
    if (!type) return
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  applyUserType(userType) {
    const u = [1, 2, 3].includes(userType) ? userType : 3
    this.setData({
      userType: u,
      showMallVip: u === 1 || u === 2,
      showUserVip: u === 3,
      showMallShopJiedan: u === 1,
      showWeddingShopJiedan: u === 2,
      showShopManage: u === 1 || u === 2,
      showPostShop: u === 3,
      otherToolsItems: buildOtherToolsByUserType(u),
      shopManageItems: buildShopManageByUserType(u)
    })
  },

  async loadMineHome() {
    try {
      const res = await network.myHomeIndex({})
      if (!res || res.code !== 0 || !res.data) {
        this.setData({
          user: {
            head: '',
            nickname: '未登录',
            association: '',
            fans: 0,
            follownumber: 0,
            money: 0,
            vouchers: 0,
            usertype: 3
          }
        })
        this.applyUserType(3)
        return
      }

      const data = res.data
      const userType = asNumber(data.usertype, 3)
      this.setData({
        user: {
          head: safeStr(data.head, ''),
          nickname: safeStr(data.nickname, ''),
          association: safeStr(data.association, ''),
          fans: asNumber(data.fans, 0),
          follownumber: asNumber(data.follownumber, 0),
          money: safeStr(data.money, '0'),
          vouchers: safeStr(data.vouchers, '0'),
          isuserivip: asNumber(data.isuserivip, 0),
          isshopvip: asNumber(data.isshopvip, 0)
        }
      })
      this.applyUserType(userType)
    } catch (e) {
      // ignore
    }
  },

  loadMallOrderStatistics() {
    AUTH.checkHasLogined().then(isLogined => {
      if (!isLogined) return
      WXAPI.orderStatistics(wx.getStorageSync('token')).then(res => {
        if (!res || res.code !== 0) return
        const data = res.data || {}
        this.setData({
          count_id_no_confirm: asNumber(data.count_id_no_confirm, 0),
          count_id_no_pay: asNumber(data.count_id_no_pay, 0),
          count_id_no_reputation: asNumber(data.count_id_no_reputation, 0),
          count_id_no_transfer: asNumber(data.count_id_no_transfer, 0)
        })
        this.refreshMallOrderBadges()
      })
    })
  },

  refreshMallOrderBadges() {
    const mallOrderItems = (this.data.mallOrderItems || []).map(it => Object.assign({}, it))
    const badgePay = this.data.count_id_no_pay
    const badgeTransfer = this.data.count_id_no_transfer
    const badgeConfirm = this.data.count_id_no_confirm
    const badgeReputation = this.data.count_id_no_reputation
    mallOrderItems.forEach(it => {
      if (it.id === 1) it.badge = badgePay > 0 ? String(badgePay > 99 ? '99+' : badgePay) : ''
      if (it.id === 2) it.badge = badgeTransfer > 0 ? String(badgeTransfer > 99 ? '99+' : badgeTransfer) : ''
      if (it.id === 3) it.badge = badgeConfirm > 0 ? String(badgeConfirm > 99 ? '99+' : badgeConfirm) : ''
      if (it.id === 4) it.badge = badgeReputation > 0 ? String(badgeReputation > 99 ? '99+' : badgeReputation) : ''
    })
    this.setData({ mallOrderItems })
  },

  onWeddingOrderTap() {
    wx.showToast({ title: '婚庆订单开发中', icon: 'none' })
  },

  onMallOrderTap(e) {
    const id = e && e.currentTarget ? asNumber(e.currentTarget.dataset.id, 0) : 0
    // 对齐 pages/order-list/index.js：status 0..3；全部不传 type
    if (id === 0) {
      wx.navigateTo({ url: '/pages/order-list/index' })
      return
    }
    const map = { 1: 0, 2: 1, 3: 2, 4: 3 }
    const type = map[id]
    if (type == null) return
    wx.navigateTo({ url: `/pages/order-list/index?type=${type}` })
  },

  onWeddingJiedanTap() {
    wx.showToast({ title: '婚庆接单开发中', icon: 'none' })
  },

  onMallJiedanTap() {
    wx.showToast({ title: '商城接单开发中', icon: 'none' })
  },

  onOtherToolTap(e) {
    const id = e && e.currentTarget ? asNumber(e.currentTarget.dataset.id, -1) : -1
    if (id === 0) {
      wx.navigateTo({ url: '/pages/idCheck/index' })
      return
    }
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  onShopManageTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  onUserToolTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  onActionTap(e) {
    const action = e && e.currentTarget ? safeStr(e.currentTarget.dataset.action) : ''
    if (!action) return

    if (action === 'charge') {
      wx.showToast({ title: '充值功能开发中', icon: 'none' })
      return
    }
    if (action === 'about') {
      wx.navigateTo({ url: '/pages/about/index' })
      return
    }
    wx.showToast({ title: '功能开发中', icon: 'none' })
  }
})

