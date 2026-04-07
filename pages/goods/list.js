const WXAPI = require('apifm-wxapi')
const AUTH = require('../../utils/auth')
const TOOLS = require('../../utils/tools.js') // TOOLS.showTabBarBadge();
Page({

  /**
   * 页面的初始数据
   */
  data: {
    listType: 1, // 1为1个商品一行，2为2个商品一行    
    name: '', // 搜索关键词
    orderBy: '', // 排序规则
    page: 1, // 读取第几页
    goods: [],
    loading: false,
    hasMore: true,
    resultCountText: '',
    sortOptions: [
      { label: '综合', value: '' },
      { label: '新品', value: 'addedDown' },
      { label: '销量', value: 'ordersDown' },
      { label: '价格', value: 'priceUp' }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      name: options.name,
      categoryId: options.categoryId
    })
    this.search()
    this.readConfigVal()
    // 补偿写法
    getApp().configLoadOK = () => {
      this.readConfigVal()
    }
  },
  onShow: function () {

  },
  readConfigVal() {
    const show_seller_number = wx.getStorageSync('show_seller_number')
    const goods_search_show_type = wx.getStorageSync('goods_search_show_type')
    let listType = 1
    if (goods_search_show_type == 2) {
      listType = 2
    }
    this.setData({
      show_seller_number,
      listType
    })
  },
  async search(){
    this.setData({ loading: true })
    const _data = {
      orderBy: this.data.orderBy,
      page: this.data.page,
      pageSize: 20,
    }
    if (this.data.name) {
      _data.k = this.data.name
    }
    if (this.data.categoryId) {
      _data.categoryId = this.data.categoryId
    }
    const res = await WXAPI.goodsv2(_data)
    this.setData({ loading: false })
    if (res.code == 0) {
      const result = (res.data && res.data.result) || []
      const nextGoods = this.data.page == 1 ? result : this.data.goods.concat(result)
      if (this.data.page == 1) {
        this.setData({
          goods: nextGoods,
        })
      } else {
        this.setData({
          goods: nextGoods,
        })
      }
      this.setData({
        hasMore: result.length >= 20,
        resultCountText: nextGoods.length ? `找到 ${nextGoods.length} 条相关商品` : ''
      })
    } else {
      if (this.data.page == 1) {
        this.setData({
          goods: [],
          hasMore: false,
          resultCountText: ''
        })
      } else {
        this.setData({
          hasMore: false
        })
        wx.showToast({
          title: '没有更多了',
          icon: 'none'
        })
      }
    }
  },
  onReachBottom() {
    if (this.data.loading || !this.data.hasMore) {
      return
    }
    this.setData({
      page: this.data.page + 1
    });
    this.search()
  },
  changeShowType(){
    if (this.data.listType == 1) {
      this.setData({
        listType: 2
      })
    } else {
      this.setData({
        listType: 1
      })
    }
  },
  bindinput(e){
    this.setData({
      name: e.detail.value
    })
  },
  bindconfirm(e){
    this.setData({
      page: 1,
      name: e.detail.value
    })
    this.search()
  },
  onSearchTap() {
    this.setData({
      page: 1
    })
    this.search()
  },
  onCancel() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }
    })
  },
  filter(e){
    this.setData({
      page: 1,
      orderBy: e.currentTarget.dataset.val
    })
    this.search()
  },
  async addShopCar(e) {
    const curGood = this.data.goods.find(ele => {
      return ele.id == e.currentTarget.dataset.id
    })
    if (!curGood) {
      return
    }
    if (curGood.stores <= 0) {
      wx.showToast({
        title: '已售罄~',
        icon: 'none'
      })
      return
    }
    if (!curGood.propertyIds && !curGood.hasAddition) {
      // 直接调用加入购物车方法
      const res = await WXAPI.shippingCarInfoAddItem(wx.getStorageSync('token'), curGood.id, 1, [])
      if (res.code == 30002) {
        // 需要选择规格尺寸
        this.setData({
          skuCurGoods: curGood
        })
      } else if (res.code == 0) {
        wx.showToast({
          title: '加入成功',
          icon: 'success'
        })
        wx.showTabBar()
        TOOLS.showTabBarBadge() // 获取购物车数据，显示TabBarBadge
      } else {
        wx.showToast({
          title: res.msg,
          icon: 'none'
        })
      }
    } else {
      // 需要选择 SKU 和 可选配件
      this.setData({
        skuCurGoods: curGood
      })
    }
  },
})
