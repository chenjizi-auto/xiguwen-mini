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
const INVITATION = 'Invitation'
const ADDRESS_XGW = 'Address'
const BANKROLL = 'Bankroll'
const WEDDING_ORDER = 'ordershq'
const INVITED = 'invited'
const AUTHENTICATION = 'Authentication'
const SMALLTOOLS = 'Smalltools'
const MEMBER = 'member'
const USER_XGW = 'User'
const FOLLOW = 'Follow'

module.exports = {
  ApiRoot: ApiRoot,
  // 登录
  AuthLogin: ApiRootUrl + INDEX + '/login', // 手机号密码登录
  AuthLoginByWeixin: ApiRootUrl + INDEX+ '/registerThirdPart', //微信登录
  // 首页
  IndexUrl: ApiRootUrl + HOME+'/index', //首页数据接口
  // 分类
  HomeCategory: ApiRootUrl + HOME+'/Classificationlist', //分类目录全部分类数据接口
  XgwHistoryCategoryList: ApiRootUrl + HOME + '/Classificationlistyou', // 查档职业分类
  // 社团
  AssociationList: ApiRootUrl + HOME_HOT + '/association', //社团列表接口（同 Android：/appapi/Homehot/association）
  // 案例
  CaseList: ApiRootUrl + HOME_HOT + '/indexcaseapp', //案例列表（同 Android：/appapi/Homehot/indexcaseapp）
  XgwGetSuggestCount: ApiRootUrl + HOME + '/GetProgrammeNumber',
  XgwGetSuggestSubmit: ApiRootUrl + HOME + '/AddWeddingPlan',
  // 城市
  CityList: ApiRootUrl + SYSTEM + '/sitelist', //城市列表（同 Android：/appapi/System/sitelist）
  XgwRegionList: ApiRootUrl + SYSTEM + '/huoqudiqu',
  XgwHistoryList: ApiRootUrl + SYSTEM + '/chadang', // 查档列表（同 Android：/appapi/System/chadang）
  // 发现（婚庆圈/商城圈，同 Android：/appapi/Found/wedding /shops）
  DiscoverWedding: ApiRootUrl + FOUND + '/wedding',
  DiscoverShops: ApiRootUrl + FOUND + '/shops',
  DiscoverPublish: ApiRootUrl + FOUND + '/publishingdynamicsd',
  DiscoverDetail: ApiRootUrl + FOUND + '/dynamicdetails',
  DiscoverComment: ApiRootUrl + FOUND + '/dynamiccomment',
  DiscoverLike: ApiRootUrl + FOUND + '/like',
  DiscoverDislike: ApiRootUrl + FOUND + '/dislike',
  // 我的（同 Android：/appapi/Myhome/index）
  MyHomeIndex: ApiRootUrl + MYHOME + '/index',
  MyFansList: ApiRootUrl + MYHOME + '/mfensi',
  MyAttentionList: ApiRootUrl + MYHOME + '/follow',
  XgwUserInfo: ApiRootUrl + MYHOME + '/personaldata',
  XgwUserInfoUpdate: ApiRootUrl + MYHOME + '/setPersonal',
  XgwMerchantHomeDetail: ApiRootUrl + USER_XGW + '/index',
  XgwMerchantDetail: ApiRootUrl + USER_XGW + '/merchantdata',
  XgwMerchantSchedule: ApiRootUrl + USER_XGW + '/dangqi',
  XgwMerchantQuoteList: ApiRootUrl + USER_XGW + '/baojialist',
  XgwMerchantWorksList: ApiRootUrl + USER_XGW + '/zuopinlistapp',
  XgwMerchantCommentList: ApiRootUrl + USER_XGW + '/businesscommentapp',
  XgwMerchantDynamic: ApiRootUrl + USER_XGW + '/dongtaiapp',
  XgwShopFollowAdd: ApiRootUrl + FOLLOW + '/gzuser',
  XgwShopFollowDelete: ApiRootUrl + FOLLOW + '/qgzuser',
  XgwCaseFollowAdd: ApiRootUrl + FOLLOW + '/gzcases',
  XgwCaseFollowDelete: ApiRootUrl + FOLLOW + '/qgzcases',
  XgwSubmitPersonCertification: ApiRootUrl + MYHOME + '/gerenrz',
  XgwGetPersonCertification: ApiRootUrl + MYHOME + '/seegerenrz',
  XgwSubmitCompanyCertification: ApiRootUrl + MYHOME + '/qiyerenz',
  XgwGetCompanyCertification: ApiRootUrl + MYHOME + '/seeqiyerz',
  XgwBankBalance: ApiRootUrl + BANKROLL + '/balance',
  XgwBankSchedule: ApiRootUrl + BANKROLL + '/balanceofpayments',
  // 活动投票 URL（同 Android：/appapi/activity/index_list）
  ActivityVoteUrl: ApiRootUrl + ACTIVITY + '/index_list',
  MineInvitationInfo: ApiRootUrl + INVITED + '/index',
  InvitationFriend: ApiRootUrl + INVITED + '/yaoqing',
  XgwInvitationList: ApiRootUrl + INVITATION + '/myinvitations',
  XgwInvitationUrl: ApiRootUrl + INVITATION + '/getmyqin',
  XgwInvitationDelete: ApiRootUrl + INVITATION + '/delinvitations',
  XgwInvitationDetail: ApiRootUrl + INVITATION + '/editinvitation',
  XgwInvitationTemplateTypes: ApiRootUrl + INVITATION + '/invitationstype',
  XgwInvitationTemplates: ApiRootUrl + INVITATION + '/invitationslist',
  XgwInvitationCreatePreview: ApiRootUrl + INVITATION + '/invitationscreateyi',
  XgwInvitationCreate: ApiRootUrl + INVITATION + '/invitationscreateer',
  XgwInvitationEdit: ApiRootUrl + INVITATION + '/editinvitation',
  XgwInvitationShareSave: ApiRootUrl + INVITATION + '/saveshare',
  WeddingNewsList: ApiRootUrl + MYHOME + '/journalism',
  WeddingOrderList: ApiRootUrl + WEDDING_ORDER + '/index',
  WeddingJiedanList: ApiRootUrl + WEDDING_ORDER + '/saleorder',
  WeddingOrderDetail: ApiRootUrl + WEDDING_ORDER + '/detailsapp',
  WeddingCancelOrder: ApiRootUrl + WEDDING_ORDER + '/cancelorder',
  WeddingFinishOrder: ApiRootUrl + WEDDING_ORDER + '/sureok',
  WeddingAcceptOrder: ApiRootUrl + WEDDING_ORDER + '/jiedan',
  WeddingRefuseOrder: ApiRootUrl + WEDDING_ORDER + '/jujuejiedan',
  WeddingFinishOrderShop: ApiRootUrl + WEDDING_ORDER + '/paypartfinishorder',
  WeddingAgreeRefund: ApiRootUrl + WEDDING_ORDER + '/shangjiatongyiapp',
  WeddingRefuseRefund: ApiRootUrl + WEDDING_ORDER + '/shangjiajujueapp',
  WeddingCancelRefund: ApiRootUrl + WEDDING_ORDER + '/yonghuchexiao',
  WeddingApplyRefund: ApiRootUrl + WEDDING_ORDER + '/tuikuantijiao',
  WeddingRefundDetail: ApiRootUrl + WEDDING_ORDER + '/yonghutuikuan',
  WeddingJiedanRefundDetail: ApiRootUrl + WEDDING_ORDER + '/shangjiatuikuanchuli',
  WeddingModifyPrice: ApiRootUrl + WEDDING_ORDER + '/modiprice',
  WeddingEvaluate: ApiRootUrl + WEDDING_ORDER + '/evaluate',
  XgwUploadImage: ApiRootUrl + SYSTEM + '/uploadimg',
  XgwUploadVideo: ApiRootUrl + SYSTEM + '/videoupload',
  XgwWeddingTypeList: ApiRootUrl + SYSTEM + '/weddingtype',
  XgwWeddingEnvironmentList: ApiRootUrl + SYSTEM + '/weddingenvironment',
  XgwStoreInformation: ApiRootUrl + MYHOME + '/storeinformation',
  XgwStoreInformationUpdate: ApiRootUrl + MYHOME + '/storeinformationedit',
  XgwShopAuthInfo: ApiRootUrl + AUTHENTICATION + '/shopmyauth',
  XgwShopAuthSubmitInfo: ApiRoot + '/' + AUTHENTICATION + '/seerenzhen',
  XgwShopAuthSubmit: ApiRoot + '/' + AUTHENTICATION + '/rzdata',
  XgwShopAuthResubmit: ApiRoot + '/' + AUTHENTICATION + '/crzdata',
  XgwShopAuthOrder: ApiRoot + '/' + AUTHENTICATION + '/flowsheet',
  XgwShopAuthRefund: ApiRoot + '/' + AUTHENTICATION + '/getouj',
  XgwGradeList: ApiRootUrl + MYHOME + '/gradelist',
  XgwGradeAdd: ApiRootUrl + MYHOME + '/addmygradeapi',
  XgwGradeDelete: ApiRootUrl + MYHOME + '/delmygrade',
  XgwGradeUpdate: ApiRootUrl + MYHOME + '/updatemygrade',
  XgwQuoteList: ApiRootUrl + 'Baojia/serverlistapi',
  XgwQuoteAdd: ApiRoot + '/Baojia/addserverapi',
  XgwQuoteEdit: ApiRoot + '/Baojia/saveserverapi',
  XgwQuoteDetail: ApiRoot + '/Baojia/baojiadetails',
  XgwQuoteDelete: ApiRoot + '/Baojia/delSsrver',
  XgwQuoteReason: ApiRoot + '/Baojia/seewei',
  XgwQuoteStatus: ApiRoot + '/Baojia/setSsrverStatus',
  XgwQuoteSubmit: ApiRoot + '/Baojia/setservarstate',
  XgwServiceCityList: ApiRootUrl + MYHOME + '/servicecitylistapi',
  XgwServiceCityAdd: ApiRootUrl + MYHOME + '/addservicecityapi',
  XgwServiceCityDelete: ApiRootUrl + MYHOME + '/delservicecity',
  XgwRecommendTeamList: ApiRootUrl + MYHOME + '/recommendedteamlist',
  XgwRecommendTeamAdd: ApiRootUrl + MYHOME + '/addrecommendedteamapi',
  XgwRecommendTeamDelete: ApiRootUrl + MYHOME + '/delrecommendedteam',
  XgwVideoList: ApiRootUrl + 'video/videolistapi',
  XgwVideoDetail: ApiRootUrl + 'video/seevideo',
  XgwVideoAdd: ApiRootUrl + 'video/addvideoapi',
  XgwVideoEdit: ApiRootUrl + 'video/updatevideo',
  XgwVideoDelete: ApiRootUrl + 'video/delvideo',
  XgwVideoReason: ApiRootUrl + 'video/videosee',
  XgwVideoSubmit: ApiRootUrl + 'video/videoexamine',
  XgwVideoStatus: ApiRootUrl + 'video/setVideoStatus',
  XgwCaseList: ApiRootUrl + 'Cases/mycaselistapi',
  XgwCaseDetail: ApiRootUrl + USER_XGW + '/casedetails',
  XgwCasePriceDetail: ApiRootUrl + USER_XGW + '/baojiaminxi',
  XgwCaseAdd: ApiRootUrl + 'Cases/addmycaseapi',
  XgwCaseEdit: ApiRootUrl + 'Cases/updatemycaseios',
  XgwCaseDelete: ApiRootUrl + 'Cases/delmycase',
  XgwCaseReason: ApiRootUrl + 'Cases/mycasesee',
  XgwCaseSubmit: ApiRootUrl + 'Cases/mycaseexamine',
  XgwCaseStatus: ApiRootUrl + 'Cases/setMycaseStatus',
  XgwCommodityList: ApiRootUrl + 'Shops/shoplist',
  XgwCommodityDetail: ApiRootUrl + 'Shops/seedanshops',
  XgwCommodityAdd: ApiRootUrl + 'Shops/addshoping',
  XgwCommodityEdit: ApiRootUrl + 'Shops/saveshopingapi',
  XgwCommodityDelete: ApiRootUrl + 'Shops/delShop',
  XgwCommodityReason: ApiRootUrl + 'Shops/seeweitongg',
  XgwCommodityStatus: ApiRootUrl + 'Shops/setShopStatus',
  XgwCommodityTypeParent: ApiRootUrl + 'Shops/getyiclounm',
  XgwCommodityTypeChild: ApiRootUrl + 'Shops/geterclounm',
  XgwCommodityFreightList: ApiRootUrl + 'Shops/freightm',
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
  XgwMyNeedList: ApiRootUrl + 'Demand/mydemand',
  XgwCloseMyNeed: ApiRootUrl + 'Demand/enddemand',
  XgwDeleteMyNeed: ApiRootUrl + 'Demand/delmydemand',
  XgwMyNeedDetail: ApiRootUrl + 'Demand/demanddetails',
  XgwAddNeed: ApiRootUrl + 'Demand/DemandRelease',
  XgwEditNeed: ApiRootUrl + 'Demand/editdemand',
  XgwNeedJoinDetail: ApiRootUrl + 'Demand/canyudetails',
  XgwNeedCooperation: ApiRootUrl + 'Demand/cooperation',
  XgwOtherNeedList: ApiRootUrl + 'Demand/bierenxuqiu',
  XgwTakeNeedOrder: ApiRootUrl + 'Demand/addwolaijd',
  XgwCommunityCenter: ApiRootUrl + 'Association/teamcenter',
  XgwCommunityJoinList: ApiRootUrl + MYHOME + '/shetuanlistapi',
  XgwCommunityJoinApply: ApiRootUrl + 'Association/inassociation',
  XgwCommunityOut: ApiRootUrl + 'Association/outassociation',
  XgwCommunityCreate: ApiRootUrl + MYHOME + '/addshetuanapi',
  XgwCommunityDetail: ApiRootUrl + 'Shetuan/index',
  XgwCommunityManagerList: ApiRootUrl + 'Association/shetuanmemberlistapi',
  XgwCommunityManagerSetAdmin: ApiRootUrl + 'Association/setguanli',
  XgwCommunityManagerCancelAdmin: ApiRootUrl + 'Association/unguanli',
  XgwCommunityManagerDelete: ApiRootUrl + 'Association/yichushetuan',
  XgwCommunityPendingList: ApiRootUrl + 'Association/waitthroughapi',
  XgwCommunityPendingAgree: ApiRootUrl + 'Association/sagree',
  XgwCommunityPendingRefuse: ApiRootUrl + 'Association/srefuse',
  XgwCommunityInviteList: ApiRootUrl + 'Association/invitationapi',
  XgwCommunityInviteSend: ApiRootUrl + 'Association/yaoqing',
  XgwCommunitySchedule: ApiRootUrl + 'Association/cydangqi',
  XgwCommunityTodayNew: ApiRootUrl + 'Association/jrxingzen',
  XgwCommunityTodayOrder: ApiRootUrl + 'Association/jryoudan',
  XgwMarriageRegistry: ApiRootUrl + SMALLTOOLS + '/registryofmarriage',
  XgwUserVipInfo: ApiRootUrl + MEMBER + '/openvip',
  XgwShopVipInfo: ApiRootUrl + MEMBER + '/shopvip',
  XgwUserVipPay: ApiRootUrl + MEMBER + '/flowsheetapp',
  XgwShopVipPay: ApiRootUrl + MEMBER + '/flowsheetshopapp',
  XgwInviteShopInfo: ApiRootUrl + INVITED + '/yaoqingsj',
  XgwApplyShop: ApiRootUrl + MEMBER + '/chengweishangjia',
  XgwChargePay: ApiRootUrl + MYHOME + '/flowsheetapp',
  XgwWeddingFlowList: ApiRootUrl + SMALLTOOLS + '/hliuchenglist',
  XgwWeddingFlowAdd: ApiRootUrl + SMALLTOOLS + '/addliucheng',
  XgwWeddingFlowEdit: ApiRootUrl + SMALLTOOLS + '/editliucheng',
  XgwWeddingFlowDelete: ApiRootUrl + SMALLTOOLS + '/delhliucheng',
  XgwBillList: ApiRootUrl + SMALLTOOLS + '/jizhanglist',
  XgwBillAdd: ApiRootUrl + SMALLTOOLS + '/jizhangadd',
  XgwBillEdit: ApiRootUrl + SMALLTOOLS + '/editjizhang',
  XgwBillDelete: ApiRootUrl + SMALLTOOLS + '/deljizhang',
  XgwSpeechList: ApiRootUrl + SMALLTOOLS + '/fayangaolist',
  XgwSpeechAdd: ApiRootUrl + SMALLTOOLS + '/addfayan',
  XgwSpeechEdit: ApiRootUrl + SMALLTOOLS + '/editfayan',
  XgwSpeechDelete: ApiRootUrl + SMALLTOOLS + '/delfayangao',
  XgwScheduleList: ApiRootUrl + SMALLTOOLS + '/richenglist',
  XgwScheduleAdd: ApiRootUrl + SMALLTOOLS + '/addricheng',
  XgwScheduleEdit: ApiRootUrl + SMALLTOOLS + '/editricheng',
  XgwScheduleDelete: ApiRootUrl + SMALLTOOLS + '/delricheng',
  XgwScheduleStatus: ApiRootUrl + SMALLTOOLS + '/setwricheng',
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
  SearchUniversal: ApiRootUrl + 'searchss', //安卓综合搜索结果
  MallMerchantSearch: ApiRootUrl + MYHOME + '/searchss', //商家列表搜索（同 Android：/appapi/Myhome/searchss）
  XgwCaseSearch: ApiRootUrl + MYHOME + '/searchss', //案例搜索（同 Android：/appapi/Myhome/searchss）
  WeddingCartInfo: ApiRootUrl + 'carthq//indexsapp', //婚庆购物车列表（按当前小程序接口路径要求保留双斜杠）
  WeddingCartRemove: ApiRootUrl + 'carthq/drop', //删除婚庆购物车商品
  WeddingCartUpdate: ApiRootUrl + 'carthq/update', //更新婚庆购物车商品数量
  SearchHelper: ApiRootUrl + 'search/helper', //搜索帮助
  SearchClearHistory: ApiRootUrl + 'search/clearHistory', //搜索帮助
  ShowSettings: ApiRootUrl + 'settings/showSettings',
  SaveSettings: ApiRootUrl + 'settings/save',
  SettingsDetail: ApiRootUrl + 'settings/userDetail',
  UploadAvatar: ApiRootUrl + 'upload/uploadAvatar',
  GetBase64: ApiRootUrl + 'qrcode/getBase64', //获取商品详情二维码

};
