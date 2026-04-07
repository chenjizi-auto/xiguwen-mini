const network = require('../../api/network-main.js')
const TOOLS = require('../../utils/tools.js')
const xgwAuth = require('../../utils/xgw-auth.js')

const app = getApp()

function safeText(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function formatBadgeCount(count) {
  const value = Number(count) || 0
  if (value <= 0) return ''
  return value > 99 ? '99+' : `${value}`
}

function formatPrice(value, fallback = '0.00') {
  const num = Number(value)
  if (Number.isFinite(num)) {
    return num.toFixed(2)
  }
  const text = safeText(value, fallback).trim()
  return text || fallback
}

function isCartLogined() {
  return xgwAuth.isLogined()
}

function computeSelectable(items) {
  const list = Array.isArray(items) ? items : []
  return list.filter(it => !!it && !it.disabled)
}

function computeSelectedPrice(items) {
  return computeSelectable(items).reduce((sum, it) => {
    if (!it.selected) return sum
    return sum + (Number(it.price) || 0) * (Number(it.number) || 0)
  }, 0)
}

function computeSelectedMeta(items) {
  const selectable = computeSelectable(items)
  const selected = selectable.filter(it => !!it.selected)
  const allSelect = selectable.length > 0 && selected.length === selectable.length
  const noSelect = selected.length === 0
  const selectedCount = selected.length
  const selectedGoodsNum = selected.reduce((sum, it) => sum + (Number(it.number) || 0), 0)
  const selectedPrice = computeSelectedPrice(items)
  return {
    allSelect,
    noSelect,
    selectedCount,
    selectedGoodsNum,
    selectedPrice,
    selectedPriceText: formatPrice(selectedPrice),
    selectedCountText: selectedCount > 0 ? `(${selectedCount})` : '',
    selectedGoodsNumText: selectedGoodsNum > 0 ? `(${selectedGoodsNum})` : ''
  }
}

function getEmptyCartInfo() {
  return {
    items: [],
    shopList: [],
    price: 0,
    score: 0,
    recommendList: []
  }
}

function resolveShopName(item, shopList = []) {
  const shopId = item && item.shopId
  const shop = (shopList || []).find(it => String(it.id) === String(shopId))
  if (shop && shop.name) return shop.name
  if (item && item.stores) return safeText(item.stores)
  return '婚庆商家'
}

function buildItemSpecs(item = {}) {
  const date = safeText(item.propertyChildDesc || item.date)
  const time = safeText(item.specs || item.time)
  const arr = [date, time].filter(Boolean)
  return arr.join(' · ')
}

function buildCartGroups(cartData) {
  const items = Array.isArray(cartData && cartData.items) ? cartData.items : []
  const shopList = Array.isArray(cartData && cartData.shopList) ? cartData.shopList : []
  const groupsMap = {}
  const groupOrder = []

  items.forEach((item, index) => {
    const groupKey = `shop-${safeText(item && item.shopId, 'unknown')}`
    if (!groupsMap[groupKey]) {
      groupsMap[groupKey] = {
        key: groupKey,
        shopId: item && item.shopId,
        shopName: resolveShopName(item, shopList),
        items: []
      }
      groupOrder.push(groupKey)
    }
    groupsMap[groupKey].items.push({
      _index: index,
      key: item && item.key,
      selected: !!(item && item.selected),
      disabled: !item || !item.stores || item.status === 1,
      left: item && item.left,
      pic: safeText(item && item.pic, '/images/default.webp'),
      title: safeText((item && item.name) || (item && item.goodsName), '购物车商品'),
      specText: buildItemSpecs(item),
      priceText: formatPrice(item && item.price),
      depositText: formatPrice((item && item.propertyChildNames) || (item && item.dikou), ''),
      number: Number(item && item.number) || 0,
      raw: item
    })
  })

  return groupOrder.map(key => {
    const group = groupsMap[key]
    const selectable = group.items.filter(item => !item.disabled)
    const selected = selectable.filter(item => item.selected)
    return Object.assign({}, group, {
      checked: selectable.length > 0 && selected.length === selectable.length,
      selectedCount: selected.length
    })
  })
}

function extractWeddingCartGroups(res) {
  if (!res || res.code !== 0) return []
  const payload = res.data
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.list)) return payload.list
  if (Array.isArray(payload.cart)) return payload.cart
  return []
}

function normalizeCartData(res) {
  const groups = extractWeddingCartGroups(res)
  const payload = res && res.code === 0 ? res.data : null
  const recommendSource = Array.isArray(payload && payload.tuijian)
    ? payload.tuijian
    : Array.isArray(payload && payload.data && payload.data.tuijian)
      ? payload.data.tuijian
      : []
  const recommendList = recommendSource.map(item => ({
    userid: item && item.userid,
    nickname: safeText(item && item.nickname, '推荐商家'),
    head: safeText(item && item.head, '/images/default.webp'),
    occupation: safeText(item && item.occupationid, '婚礼商家'),
    priceText: `${formatPrice(item && item.zuidijia)}起`,
    isShopVip: Number(item && item.isshopvip) === 1,
    sincerity: Number(item && item.sincerity) === 1,
    platform: Number(item && item.platform) === 1,
    realname: Number(item && item.shiming) === 1,
    collegeText: safeText(item && item.xueyuanname),
    shopnum: Number(item && item.shopnum) || 0,
    anlinum: Number(item && item.anlinum) || 0,
    evaluate: Number(item && item.evaluate) || 0
  }))

  if (!groups.length) {
    return Object.assign({}, getEmptyCartInfo(), { recommendList })
  }
  const items = []
  const shopList = []

  groups.forEach(group => {
    const seller = group && group.seller ? group.seller : {}
    const storeId = group && group.store_id != null ? group.store_id : seller.userid
    shopList.push({
      id: storeId,
      name: safeText(seller.nickname || seller.name, '婚庆商家')
    })

    ;((group && group.goods) || []).forEach(goods => {
      items.push({
        key: goods && goods.rec_id,
        shopId: storeId,
        stores: safeText(seller.nickname || seller.name, '婚庆商家'),
        selected: false,
        status: 0,
        left: '',
        pic: safeText(goods && (goods.baojia_image || goods.goods_image), '/images/default.webp'),
        name: safeText(goods && goods.baojia_name, '购物车商品'),
        goodsName: safeText(goods && goods.baojia_name, '购物车商品'),
        propertyChildDesc: safeText(goods && goods.baojia_date),
        specs: safeText(goods && goods.specification),
        price: goods && goods.price,
        propertyChildNames: safeText(goods && goods.partprice),
        dikou: safeText(goods && goods.dikou),
        number: Number(goods && goods.quantity) || 0
      })
    })
  })

  return {
    items,
    shopList,
    price: '0.00',
    score: 0,
    recommendList
  }
}

Page({
  data: {
    saveHidden: true,
    allSelect: true,
    delBtnWidth: 160, //删除按钮宽度单位（rpx）

    // UI / meta
    load_img: '/images/load_img.webp',
    load_img_erro: '/images/load_img_erro.webp',
    noSelect: true,
    selectedCount: 0,
    selectedGoodsNum: 0,
    selectedCountText: '',
    selectedGoodsNumText: '',
    isLogined: false,
    selfCartCount: 0,
    selfCartCountText: '',
    cartTitle: '购物车',
    navHeight: 88,
    navTop: 44,
    menuHeight: 32,
    menuRight: 12,
    navRightGap: 16,
    shippingCarInfo: getEmptyCartInfo(),
    cartGroups: [],
    recommendList: []
  },

  //获取元素自适应后的实际宽度
  getEleWidth: function (w) {
    var real = 0;
    try {
      var res = wx.getSystemInfoSync().windowWidth
      var scale = (750 / 2) / (w / 2)
      // console.log(scale);
      real = Math.floor(res / scale);
      return real;
    } catch (e) {
      return false;
      // Do something when catch error
    }
  },
  initEleWidth: function () {
    var delBtnWidth = this.getEleWidth(this.data.delBtnWidth);
    this.setData({
      delBtnWidth: delBtnWidth
    });
  },
  setNavMetrics() {
    const globalData = app.globalData || {}
    const systemInfo = wx.getSystemInfoSync()
    const menuButtonObject =
      globalData.menuButtonObject || wx.getMenuButtonBoundingClientRect()
    const fallbackNavTop = systemInfo.statusBarHeight || 20
    const navTop = globalData.navTop || menuButtonObject.top || fallbackNavTop
    const menuHeight = menuButtonObject.height || 32
    const navHeight =
      globalData.navHeight ||
      (navTop + menuHeight + ((menuButtonObject.top || navTop) - navTop) * 2)
    const windowWidth = systemInfo.windowWidth || 375
    const menuRight = menuButtonObject.right
      ? Math.max(windowWidth - menuButtonObject.right, 12)
      : 12

    this.setData({
      navHeight,
      navTop,
      menuHeight,
      menuRight,
      navRightGap: menuRight
    })
  },
  onLoad: function () {
    this.initEleWidth()
    this.setNavMetrics()
  },
  onShow: function () {
    this.refreshPageData()
  },
  async refreshPageData() {
    await new Promise(resolve => {
      this.setData({
        isLogined: isCartLogined()
      }, resolve)
    })

    await this.shippingCarInfo()
  },
  async shippingCarInfo() {
    if (!isCartLogined()) {
      this.setData({
        isLogined: false,
        cartTitle: '购物车',
        selfCartCount: 0,
        selfCartCountText: '',
        shippingCarInfo: getEmptyCartInfo(),
        cartGroups: [],
        recommendList: [],
        ...computeSelectedMeta([])
      })
      return
    }
    let selfRes = null

    try {
      selfRes = await network.weddingCartInfo()
    } catch (e) {
      selfRes = null
    }

    const currentData = normalizeCartData(selfRes)
    const currentCount = currentData.items.length
    const cartGroups = buildCartGroups(currentData)
    const selectedMeta = computeSelectedMeta(currentData.items)

    this.setData({
      isLogined: true,
      cartTitle: currentCount > 0 ? `购物车(${currentCount})` : '购物车',
      selfCartCount: currentData.items.length,
      selfCartCountText: formatBadgeCount(currentData.items.length),
      shippingCarInfo: Object.assign({}, currentData, {
        price: selectedMeta.selectedPriceText,
        score: 0
      }),
      cartGroups,
      recommendList: currentData.recommendList || [],
      ...selectedMeta
    })
  },
  toIndexPage: function () {
    wx.switchTab({
      url: "/pages/index/index"
    });
  },

  toLoginPage() {
    wx.navigateTo({
      url: '/pages/login/index'
    })
  },

  async toggleSelectAll() {
    if (!isCartLogined()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const currentInfo = this.data.shippingCarInfo || getEmptyCartInfo()
    const items = Array.isArray(currentInfo.items) ? currentInfo.items.slice() : []
    const selectable = computeSelectable(items)
    if (selectable.length === 0) return

    const target = !this.data.allSelect
    const nextItems = items.map(item => {
      if (item && !item.disabled) {
        return Object.assign({}, item, { selected: target })
      }
      return item
    })
    const selectedMeta = computeSelectedMeta(nextItems)

    this.setData({
      shippingCarInfo: Object.assign({}, currentInfo, {
        items: nextItems,
        price: selectedMeta.selectedPriceText
      }),
      cartGroups: buildCartGroups({
        items: nextItems,
        shopList: currentInfo.shopList || [],
        price: selectedMeta.selectedPriceText,
        score: 0
      }),
      ...selectedMeta
    })
  },

  onGroupToggle(e) {
    const shopId = e.currentTarget.dataset.shopId
    const currentInfo = this.data.shippingCarInfo || getEmptyCartInfo()
    const items = Array.isArray(currentInfo.items) ? currentInfo.items.slice() : []
    const groupItems = items.filter(item => String(item.shopId) === String(shopId) && !item.disabled)
    if (!groupItems.length) return

    const shouldSelect = groupItems.some(item => !item.selected)
    const nextItems = items.map(item => {
      if (String(item.shopId) === String(shopId) && !item.disabled) {
        return Object.assign({}, item, { selected: shouldSelect })
      }
      return item
    })
    const selectedMeta = computeSelectedMeta(nextItems)

    this.setData({
      shippingCarInfo: Object.assign({}, currentInfo, {
        items: nextItems,
        price: selectedMeta.selectedPriceText
      }),
      cartGroups: buildCartGroups({
        items: nextItems,
        shopList: currentInfo.shopList || [],
        price: selectedMeta.selectedPriceText,
        score: 0
      }),
      ...selectedMeta
    })
  },

  async deleteSelected() {
    if (!isCartLogined()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const items = (this.data.shippingCarInfo && this.data.shippingCarInfo.items) || []
    const selectable = computeSelectable(items)
    const selected = selectable.filter(it => !!it.selected)
    if (selected.length === 0) {
      wx.showToast({ title: '请先选择商品', icon: 'none' })
      return
    }

    wx.showModal({
      content: `确定删除选中的 ${selected.length} 件商品吗？`,
      success: async (r) => {
        if (!r.confirm) return
        try {
          await Promise.all(selected.map(it => network.weddingCartRemove({ rec_id: it.key })))
        } catch (e) {
          // ignore
        }
        this.shippingCarInfo()
        TOOLS.showTabBarBadge()
      }
    })
  },

  onCheckoutTap() {
    if (this.data.noSelect) {
      wx.showToast({ title: '请先选择商品', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pages/to-pay-order/index?shopCarType=0'
    })
  },

  onRecommendTap(e) {
    const userid = e.currentTarget.dataset.userid
    if (!userid) return
    wx.navigateTo({
      url: `/packageWedding/pages/merchant/detail?userid=${encodeURIComponent(userid)}`
    })
  },

  touchS: function (e) {
    if (e.touches.length == 1) {
      this.setData({
        startX: e.touches[0].clientX
      });
    }
  },
  touchM: function (e) {
    const index = e.currentTarget.dataset.index;
    if (e.touches.length == 1) {
      var moveX = e.touches[0].clientX;
      var disX = this.data.startX - moveX;
      var delBtnWidth = this.data.delBtnWidth;
      var left = "";
      if (disX == 0 || disX < 0) { //如果移动距离小于等于0，container位置不变
        left = "margin-left:0px";
      } else if (disX > 0) { //移动距离大于0，container left值等于手指移动距离
        left = "margin-left:-" + disX + "px";
        if (disX >= delBtnWidth) {
          left = "left:-" + delBtnWidth + "px";
        }
      }
      this.data.shippingCarInfo.items[index].left = left
      this.setData({
        shippingCarInfo: this.data.shippingCarInfo,
        cartGroups: buildCartGroups(this.data.shippingCarInfo)
      })
    }
  },

  touchE: function (e) {
    var index = e.currentTarget.dataset.index;
    if (e.changedTouches.length == 1) {
      var endX = e.changedTouches[0].clientX;
      var disX = this.data.startX - endX;
      var delBtnWidth = this.data.delBtnWidth;
      //如果距离小于删除按钮的1/2，不显示删除按钮
      var left = disX > delBtnWidth / 2 ? "margin-left:-" + delBtnWidth + "px" : "margin-left:0px";
      this.data.shippingCarInfo.items[index].left = left
      this.setData({
        shippingCarInfo: this.data.shippingCarInfo,
        cartGroups: buildCartGroups(this.data.shippingCarInfo)
      })
    }
  },
  async delItem(e) {
    const key = e.currentTarget.dataset.key
    this.delItemDone(key)
  },
  async delItemDone(key) {
    var res = await network.weddingCartRemove({ rec_id: key })
    if (!res || (res.code != 0 && res.code != 700)) {
      wx.showToast({
        title: (res && res.msg) || '删除失败',
        icon: 'none'
      })
    } else {
      this.shippingCarInfo()
      TOOLS.showTabBarBadge()
    }
  },
  async jiaBtnTap(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.shippingCarInfo.items[index]
    const number = item.number + 1
    await network.weddingCartUpdate({ rec_id: item.key, quantity: number })
    this.shippingCarInfo()
  },
  async jianBtnTap(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.shippingCarInfo.items[index]
    const number = item.number - 1
    if (number <= 0) {
      // 弹出删除确认
      wx.showModal({
        content: '确定要删除该商品吗？',
        success: (res) => {
          if (res.confirm) {
            this.delItemDone(item.key)
          }
        }
      })
      return
    }
    await network.weddingCartUpdate({ rec_id: item.key, quantity: number })
    this.shippingCarInfo()
  },
  changeCarNumber(e) {
    const key = e.currentTarget.dataset.key
    const num = e.detail.value
    network.weddingCartUpdate({ rec_id: key, quantity: num }).then(res => {
      this.shippingCarInfo()
    })
  },
  async radioClick(e) {
    var index = e.currentTarget.dataset.index;
    var currentInfo = this.data.shippingCarInfo || getEmptyCartInfo()
    var items = Array.isArray(currentInfo.items) ? currentInfo.items.slice() : []
    var item = items[index]
    if (!item || item.disabled) {
      return
    }
    items[index] = Object.assign({}, item, { selected: !item.selected })
    const selectedMeta = computeSelectedMeta(items)
    this.setData({
      shippingCarInfo: Object.assign({}, currentInfo, {
        items,
        price: selectedMeta.selectedPriceText
      }),
      cartGroups: buildCartGroups({
        items,
        shopList: currentInfo.shopList || [],
        price: selectedMeta.selectedPriceText,
        score: 0
      }),
      ...selectedMeta
    })
  },

  onCartImgError(e) {
    const index = e && e.currentTarget ? Number(e.currentTarget.dataset.index) : -1
    if (index < 0) return
    const current = this.data.shippingCarInfo || getEmptyCartInfo()
    const items = Array.isArray(current.items) ? current.items.slice() : []
    if (!items[index]) return
    items[index] = Object.assign({}, items[index], { pic: this.data.load_img_erro })
    const shippingCarInfo = Object.assign({}, current, { items })
    this.setData({
      shippingCarInfo,
      cartGroups: buildCartGroups(shippingCarInfo)
    })
  }
})
