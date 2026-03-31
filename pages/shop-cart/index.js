const WXAPI = require('apifm-wxapi')
const TOOLS = require('../../utils/tools.js')

const app = getApp()

function formatBadgeCount(count) {
  const value = Number(count) || 0
  if (value <= 0) return ''
  return value > 99 ? '99+' : `${value}`
}

function computeSelectable(items, shopCarType) {
  const list = Array.isArray(items) ? items : []
  if (shopCarType === 0) {
    return list.filter(it => !!it && !!it.stores && it.status !== 1)
  }
  return list.filter(Boolean)
}

function computeSelectedMeta(items, shopCarType) {
  const selectable = computeSelectable(items, shopCarType)
  const selected = selectable.filter(it => !!it.selected)
  const allSelect = selectable.length > 0 && selected.length === selectable.length
  const noSelect = selected.length === 0
  const selectedCount = selected.length
  const selectedGoodsNum = selected.reduce((sum, it) => sum + (Number(it.number) || 0), 0)
  return {
    allSelect,
    noSelect,
    selectedCount,
    selectedGoodsNum,
    selectedCountText: selectedCount > 0 ? `(${selectedCount})` : '',
    selectedGoodsNumText: selectedGoodsNum > 0 ? `(${selectedGoodsNum})` : ''
  }
}

function getEmptyCartInfo() {
  return {
    items: [],
    shopList: [],
    price: 0,
    score: 0
  }
}

function normalizeCartData(res, shopCarType) {
  if (!res || res.code !== 0 || !res.data) {
    return getEmptyCartInfo()
  }

  const data = res.data || {}
  const items = Array.isArray(data.items)
    ? data.items.map(item => {
        const next = Object.assign({}, item)
        if (shopCarType === 0 && (!next.stores || next.status === 1)) {
          next.selected = false
        }
        return next
      })
    : []

  return {
    items,
    shopList: Array.isArray(data.shopList) ? data.shopList : [],
    price: data.price || 0,
    score: data.score || 0
  }
}

Page({
  data: {
    shopCarType: 0, //0自营 1云货架
    saveHidden: true,
    allSelect: true,
    delBtnWidth: 120, //删除按钮宽度单位（rpx）

    // UI / meta
    load_img: '/images/load_img.png',
    load_img_erro: '/images/load_img_erro.png',
    editMode: false,
    noSelect: true,
    selectedCount: 0,
    selectedGoodsNum: 0,
    selectedCountText: '',
    selectedGoodsNumText: '',
    isLogined: false,
    shopping_cart_vop_open: 0,
    selfCartCount: 0,
    selfCartCountText: '',
    vopCartCount: 0,
    vopCartCountText: '',
    navHeight: 88,
    navTop: 44,
    menuHeight: 32,
    menuRight: 12,
    navRightGap: 16,
    editRight: 24,

    shippingCarInfo: getEmptyCartInfo()
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
      navRightGap: menuRight,
      editRight: menuRight + 12
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
    const shopping_cart_vop_open = Number(wx.getStorageSync('shopping_cart_vop_open')) || 0
    const nextShopCarType =
      shopping_cart_vop_open === 1 && Number(this.data.shopCarType) === 1 ? 1 : 0

    await new Promise(resolve => {
      this.setData({
        shopping_cart_vop_open,
        shopCarType: nextShopCarType,
        isLogined: !!wx.getStorageSync('token')
      }, resolve)
    })

    await this.shippingCarInfo()
  },
  async shippingCarInfo() {
    const token = wx.getStorageSync('token')
    if (!token) {
      this.setData({
        isLogined: false,
        selfCartCount: 0,
        selfCartCountText: '',
        vopCartCount: 0,
        vopCartCountText: '',
        shippingCarInfo: getEmptyCartInfo(),
        ...computeSelectedMeta([], Number(this.data.shopCarType) || 0)
      })
      return
    }
    const shopCarType = Number(this.data.shopCarType) || 0
    const isVopOpen = Number(this.data.shopping_cart_vop_open) === 1
    let selfRes = null
    let vopRes = null

    try {
      if (isVopOpen) {
        const result = await Promise.all([
          WXAPI.shippingCarInfo(token),
          WXAPI.jdvopCartInfo(token)
        ])
        selfRes = result[0]
        vopRes = result[1]
      } else {
        selfRes = await WXAPI.shippingCarInfo(token)
      }
    } catch (e) {
      selfRes = null
      vopRes = null
    }

    const selfData = normalizeCartData(selfRes, 0)
    const vopData = normalizeCartData(vopRes, 1)
    const currentData = shopCarType === 1 ? vopData : selfData

    this.setData({
      isLogined: true,
      selfCartCount: selfData.items.length,
      selfCartCountText: formatBadgeCount(selfData.items.length),
      vopCartCount: vopData.items.length,
      vopCartCountText: formatBadgeCount(vopData.items.length),
      shippingCarInfo: currentData,
      ...computeSelectedMeta(currentData.items, shopCarType)
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

  toggleEditMode() {
    this.setData({
      editMode: !this.data.editMode
    })
  },

  selectCartTab(e) {
    const shopCarType = Number(e.currentTarget.dataset.type) || 0
    if (shopCarType === Number(this.data.shopCarType)) {
      return
    }
    this.setData({
      shopCarType,
      editMode: false
    }, () => {
      this.shippingCarInfo()
    })
  },

  async toggleSelectAll() {
    const token = wx.getStorageSync('token')
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const items = (this.data.shippingCarInfo && this.data.shippingCarInfo.items) || []
    const selectable = computeSelectable(items, this.data.shopCarType)
    if (selectable.length === 0) return

    const target = !this.data.allSelect

    try {
      if (this.data.shopCarType == 0) {
        await Promise.all(selectable.map(it => WXAPI.shippingCartSelected(token, it.key, target)))
      } else {
        await Promise.all(selectable.map(it => WXAPI.jdvopCartSelect(token, it.key, target)))
      }
    } catch (e) {
      // ignore
    }

    this.shippingCarInfo()
  },

  async deleteSelected() {
    const token = wx.getStorageSync('token')
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const items = (this.data.shippingCarInfo && this.data.shippingCarInfo.items) || []
    const selectable = computeSelectable(items, this.data.shopCarType)
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
          if (this.data.shopCarType == 0) {
            await Promise.all(selected.map(it => WXAPI.shippingCarInfoRemoveItem(token, it.key)))
          } else {
            await Promise.all(selected.map(it => WXAPI.jdvopCartRemove(token, it.key)))
          }
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
      url: `/pages/to-pay-order/index?shopCarType=${this.data.shopCarType}`
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
        shippingCarInfo: this.data.shippingCarInfo
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
        shippingCarInfo: this.data.shippingCarInfo
      })
    }
  },
  async delItem(e) {
    const key = e.currentTarget.dataset.key
    this.delItemDone(key)
  },
  async delItemDone(key) {
    const token = wx.getStorageSync('token')
    if(this.data.shopCarType == 0){
      var res = await WXAPI.shippingCarInfoRemoveItem(token, key)
    }
    if(this.data.shopCarType == 1){
      var res = await WXAPI.jdvopCartRemove(token, key)
    }
    if (res.code != 0 && res.code != 700) {
      wx.showToast({
        title: res.msg,
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
    const token = wx.getStorageSync('token')
    if(this.data.shopCarType == 0){
      var res = await WXAPI.shippingCarInfoModifyNumber(token, item.key, number)
    }
    else if(this.data.shopCarType == 1){
      var res = await WXAPI.jdvopCartModifyNumber(token, item.key, number)
    }    
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
    const token = wx.getStorageSync('token')
    if(this.data.shopCarType == 0)
    {
      var res = await WXAPI.shippingCarInfoModifyNumber(token, item.key, number)  
    }
    if(this.data.shopCarType == 1)
    {
      var res = await WXAPI.jdvopCartModifyNumber(token, item.key, number)  
    }
    this.shippingCarInfo()
  },
  changeCarNumber(e) {
    const key = e.currentTarget.dataset.key
    const num = e.detail.value
    const token = wx.getStorageSync('token')
    if(this.data.shopCarType == 0){
    WXAPI.shippingCarInfoModifyNumber(token, key, num).then(res => {
      this.shippingCarInfo()
    })}
    else if(this.data.shopCarType == 1){
      WXAPI.jdvopCartModifyNumber(token, key, num).then(res => {
        this.shippingCarInfo()
      })
    }
  },
  async radioClick(e) {
    var index = e.currentTarget.dataset.index;
    var item = this.data.shippingCarInfo.items[index]
    const token = wx.getStorageSync('token')
    if (this.data.shopCarType == 0) { //自营购物车
      if (!item.stores || item.status == 1) {
        return
      }
      var res = await WXAPI.shippingCartSelected(token, item.key, !item.selected)
    } else if (this.data.shopCarType == 1) { //云货架购物车
      var res = await WXAPI.jdvopCartSelect(token, item.key, !item.selected)
    }
    this.shippingCarInfo()
  },
  onChange(event) {
    this.setData({
      shopCarType: Number(event.detail.name) || 0
    })
    this.shippingCarInfo()
  },

  onCartImgError(e) {
    const index = e && e.currentTarget ? Number(e.currentTarget.dataset.index) : -1
    if (index < 0) return
    this.setData({
      [`shippingCarInfo.items[${index}].pic`]: this.data.load_img_erro
    })
  }
})
