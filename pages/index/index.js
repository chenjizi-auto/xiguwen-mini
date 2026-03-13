const TOOLS = require('../../utils/tools.js')
const network = require('../../api/network.js');
const api = require('../../api/api.js');
const APP = getApp()

Page({
  data: {
    inputVal: "", // 搜索框内容
    goodsRecommend: [], // 推荐商品
    kanjiaList: [], //砍价商品列表
    pingtuanList: [], //拼团商品列表
    loadingHidden: false, // loading
    selectCurrent: 0,
    categories_p1: [],
    categories_p2: [],
    goods: [],
    loadingMoreHidden: true,
    coupons: [],
    curPage: 1,
    pageSize: 20,
    tabs:['婚庆','社团','案例'],
    city:'成都',
    activeIndex: 0,
    banners:[],
    rementuandui:[],
    remenhuodong:{},
    youlike:[]
  },
  tabClick(e) {
    this.setData({
      activeIndex: e.detail.index
    });
  },
  
  onLoad: function(e) {
  
  },
 
  onShow: function(e){
    this.setData({
      navHeight: APP.globalData.navHeight,
      navTop: APP.globalData.navTop,
      windowHeight: APP.globalData.windowHeight,
      menuButtonObject: APP.globalData.menuButtonObject //小程序胶囊信息
    })
    console.log(this.data.activeIndex)
    if(this.data.activeIndex === 0 ){
      this.loadHome({cityid:'0'})
      this.loadHomeCategory({})
    }
  },


  loadHome:function(data){
    let that = this;
   network.mainPage(data).then(res=>{
     console.log(res)
        if(res.code === 0){
          console.log(res.data.remenhuodong)
          // console.log(JSON.stringify(res.data.youlike))
          this.initBanner(res.data.guanggaolunbo)
          that.setData({
              rementuandui:res.data.rementuandui.data
          })
          that.setData({
            remenhuodong:res.data.remenhuodong
        })
        that.setData({
          youlike:res.data.youlike
        })
        }
    });
  },

  loadHomeCategory:function(data){
    let that = this
      network.homeCategory(data).then(res => {
        if(res.code === 0){
          console.log(res)
            // let a =  res.data.unshift({occupationid:'0',proname:'全部',wapimg:''},res.data) 
            that.setData({categories_p1:res.data.slice(0,10)})
            that.setData({categories_p2:res.data.slice(10,19)})
        }
      })
  },

  initBanner (data){
      this.setData({
        banners: data
      });
  }




})