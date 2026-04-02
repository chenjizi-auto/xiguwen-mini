const ApiRoot = 'https://www.xiguwen520.com';
// const ApiRoot = 'http://192.168.0.113:8361';
// const ApiRoot = 'https://www.qile.club:8688';
const ApiRootUrl = ApiRoot + '/appapi/'
const INDEX = 'index'
const HOME = 'home'
const HOME_HOT = 'Homehot'
const SYSTEM = 'System'
const FOUND = 'Found'
const MYHOME = 'Myhome'
const ACTIVITY = 'activity'
const ADDRESS_XGW = 'Address'
const BANKROLL = 'Bankroll'

module.exports = {
  ApiRoot: ApiRoot,
  // 登录
  AuthLogin: ApiRootUrl + INDEX + '/login', // 手机号密码登录
  AuthLoginByWeixin: ApiRootUrl + INDEX+ '/registerThirdPart', //微信登录
  // 首页
  IndexUrl: ApiRootUrl + HOME+'/index', //首页数据接口
  // 分类
  HomeCategory: ApiRootUrl + HOME+'/Classificationlist', //分类目录全部分类数据接口
  // 社团
  AssociationList: ApiRootUrl + HOME_HOT + '/association', //社团列表接口（同 Android：/appapi/Homehot/association）
  // 案例
  CaseList: ApiRootUrl + HOME_HOT + '/indexcaseapp', //案例列表（同 Android：/appapi/Homehot/indexcaseapp）
  // 城市
  CityList: ApiRootUrl + SYSTEM + '/sitelist', //城市列表（同 Android：/appapi/System/sitelist）
  // 发现（婚庆圈/商城圈，同 Android：/appapi/Found/wedding /shops）
  DiscoverWedding: ApiRootUrl + FOUND + '/wedding',
  DiscoverShops: ApiRootUrl + FOUND + '/shops',
  DiscoverPublish: ApiRootUrl + FOUND + '/publishingdynamicsd',
  // 我的（同 Android：/appapi/Myhome/index）
  MyHomeIndex: ApiRootUrl + MYHOME + '/index',
  MyFansList: ApiRootUrl + MYHOME + '/mfensi',
  MyAttentionList: ApiRootUrl + MYHOME + '/follow',
  XgwUserInfo: ApiRootUrl + MYHOME + '/personaldata',
  XgwUserInfoUpdate: ApiRootUrl + MYHOME + '/setPersonal',
  XgwBankBalance: ApiRootUrl + BANKROLL + '/balance',
  XgwBankSchedule: ApiRootUrl + BANKROLL + '/balanceofpayments',
  // 活动投票 URL（同 Android：/appapi/activity/index_list）
  ActivityVoteUrl: ApiRootUrl + ACTIVITY + '/index_list',
  XgwUploadImage: ApiRootUrl + SYSTEM + '/uploadimg',
  XgwAtlasList: ApiRootUrl + 'Atlas/atlaslist',
  XgwAtlasDetail: ApiRootUrl + 'Atlas/Atlasdetails',
  XgwAtlasAdd: ApiRootUrl + 'Atlas/addAtlas',
  XgwAtlasEdit: ApiRootUrl + 'Atlas/editatlasios',
  XgwAtlasDelete: ApiRootUrl + 'Atlas/delatlas',
  XgwAtlasReason: ApiRootUrl + 'Atlas/atlassee',
  XgwAtlasStatus: ApiRootUrl + 'Atlas/setAtlasStatus',
  XgwAtlasSubmit: ApiRootUrl + 'Atlas/atlasexamine',
  XgwAddressList: ApiRootUrl + ADDRESS_XGW + '/addresslist',
  XgwAddressAdd: ApiRootUrl + ADDRESS_XGW + '/addsite',
  XgwAddressUpdate: ApiRootUrl + ADDRESS_XGW + '/updateAddsite',
  XgwAddressDelete: ApiRootUrl + ADDRESS_XGW + '/delsite',
  XgwAddressDefault: ApiRootUrl + ADDRESS_XGW + '/shemoren',
  XgwGetVerifyCode: ApiRootUrl + INDEX + '/getverifycode',
  XgwPasswordVerify: ApiRootUrl + INDEX + '/retrievepwd',
  XgwPasswordReset: ApiRootUrl + INDEX + '/retrievepwds',
  XgwPayPasswordReset: ApiRootUrl + INDEX + '/repaypwd',
  XgwPhoneVerify: ApiRootUrl + INDEX + '/upmobile',
  XgwPhoneUpdate: ApiRootUrl + INDEX + '/upmobiles',
  XgwBindOther: ApiRootUrl + INDEX + '/threeparties',
  XgwUserCancel: ApiRootUrl + INDEX + '/usercancel',
  CatalogCurrent: ApiRootUrl + 'catalog/current', //分类目录当前分类数据接口
  GetCurrentList: ApiRootUrl + 'catalog/currentlist',
  // 购物车
  CartAdd: ApiRootUrl + 'cart/add', // 添加商品到购物车
  CartList: ApiRootUrl + 'cart/index', //获取购物车的数据
  CartUpdate: ApiRootUrl + 'cart/update', // 更新购物车的商品
  CartDelete: ApiRootUrl + 'cart/delete', // 删除购物车的商品
  CartChecked: ApiRootUrl + 'cart/checked', // 选择或取消选择商品
  CartGoodsCount: ApiRootUrl + 'cart/goodsCount', // 获取购物车商品件数
  CartCheckout: ApiRootUrl + 'cart/checkout', // 下单前信息确认
  // 商品
  GoodsCount: ApiRootUrl + 'goods/count', //统计商品总数
  GoodsDetail: ApiRootUrl + 'goods/detail', //获得商品的详情
  GoodsList: ApiRootUrl + 'goods/list', //获得商品列表
  GoodsShare: ApiRootUrl + 'goods/goodsShare', //获得商品的详情
  SaveUserId: ApiRootUrl + 'goods/saveUserId',
  // 收货地址
  AddressDetail: ApiRootUrl + 'address/addressDetail', //收货地址详情
  DeleteAddress: ApiRootUrl + 'address/deleteAddress', //保存收货地址
  SaveAddress: ApiRootUrl + 'address/saveAddress', //保存收货地址
  GetAddresses: ApiRootUrl + 'address/getAddresses',
  RegionList: ApiRootUrl + 'region/list', //获取区域列表
  PayPrepayId: ApiRootUrl + 'pay/preWeixinPay', //获取微信统一下单prepay_id
  OrderSubmit: ApiRootUrl + 'order/submit', // 提交订单
  OrderList: ApiRootUrl + 'order/list', //订单列表
  OrderDetail: ApiRootUrl + 'order/detail', //订单详情
  OrderDelete: ApiRootUrl + 'order/delete', //订单删除
  OrderCancel: ApiRootUrl + 'order/cancel', //取消订单
  OrderConfirm: ApiRootUrl + 'order/confirm', //物流详情
  OrderCount: ApiRootUrl + 'order/count', // 获取订单数
  OrderCountInfo: ApiRootUrl + 'order/orderCount', // 我的页面获取订单数状态
  OrderExpressInfo: ApiRootUrl + 'order/express', //物流信息
  OrderGoods: ApiRootUrl + 'order/orderGoods', // 获取checkout页面的商品列表
  // 足迹
  FootprintList: ApiRootUrl + 'footprint/list', //足迹列表
  FootprintDelete: ApiRootUrl + 'footprint/delete', //删除足迹
  // 搜索
  SearchIndex: ApiRootUrl + 'search/index', //搜索页面数据
  SearchHelper: ApiRootUrl + 'search/helper', //搜索帮助
  SearchClearHistory: ApiRootUrl + 'search/clearHistory', //搜索帮助
  ShowSettings: ApiRootUrl + 'settings/showSettings',
  SaveSettings: ApiRootUrl + 'settings/save',
  SettingsDetail: ApiRootUrl + 'settings/userDetail',
  UploadAvatar: ApiRootUrl + 'upload/uploadAvatar',
  GetBase64: ApiRootUrl + 'qrcode/getBase64', //获取商品详情二维码

};
