const Network = require('miniprogram-network');
// 也可使用 es6 import 写法
// setConfig设置所有网络请求的全局默认配置,一次定义，所有文件中使用均生效
Network.setConfig('baseURL','https://www.xiguwen520.com')
Network.REQUEST.Defaults.transformResponse = Network.transformRequestResponseOkData

const api = require('/api.js');

function commonParam(){
  return {'token':wx.getStorageSync('token'),'userid':wx.getStorageSync('userInfo').userid}
}

export async function loginThrid(data){
  return new Promise((resolve, reject) => {
        Network.post(api.AuthLoginByWeixin,Object.assign(data,commonParam)).then (res=>{
            resolve(res);
        })
  })
}

export async function mainPage(data){
  return new Promise((resolve, reject) => {
        Network.post(api.IndexUrl,Object.assign(data,commonParam)).then (res=>{
            resolve(res);
        })
  })
}

export async function homeCategory(data){
  return new Promise((resolve, reject) => {
        Network.post(api.HomeCategory,Object.assign(data,commonParam)).then (res=>{
            resolve(res);
        })
  })
}


