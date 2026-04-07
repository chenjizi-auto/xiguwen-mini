const { ApiRoot } = require('./base.js')

const ApiRootUrl = `${ApiRoot}/appapi/`

module.exports = {
  AuthLogin: `${ApiRootUrl}index/login`,
  AuthLoginByWeixin: `${ApiRootUrl}index/registerThirdPart`,
  IndexUrl: `${ApiRootUrl}home/index`,
  HomeCategory: `${ApiRootUrl}home/Classificationlist`,
  AssociationList: `${ApiRootUrl}Homehot/association`,
  CaseList: `${ApiRootUrl}Homehot/indexcaseapp`,
  CityList: `${ApiRootUrl}System/sitelist`,
  SearchIndex: `${ApiRootUrl}search/index`,
  SearchClearHistory: `${ApiRootUrl}search/clearHistory`,
  SearchUniversal: `${ApiRootUrl}searchss`,
  DiscoverWedding: `${ApiRootUrl}Found/wedding`,
  DiscoverShops: `${ApiRootUrl}Found/shops`,
  MyHomeIndex: `${ApiRootUrl}Myhome/index`,
  XgwMerchantSearch: `${ApiRootUrl}Myhome/searchss`,
  XgwShopFollowAdd: `${ApiRootUrl}Follow/gzuser`,
  XgwShopFollowDelete: `${ApiRootUrl}Follow/qgzuser`,
  WeddingCartInfo: `${ApiRootUrl}carthq//indexsapp`,
  WeddingCartRemove: `${ApiRootUrl}carthq/drop`,
  WeddingCartUpdate: `${ApiRootUrl}carthq/update`
}
