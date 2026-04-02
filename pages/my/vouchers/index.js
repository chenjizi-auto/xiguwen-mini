const xgwAuth = require('../../../utils/xgw-auth.js')

function safeStr(value, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function formatPrice(value) {
  const text = safeStr(value, '0').trim()
  if (!text) return '0'
  const num = Number(text)
  if (!Number.isFinite(num)) return text
  return Number.isInteger(num) ? String(num) : num.toFixed(2)
}

Page({
  data: {
    price: '0',
    title: '现金抵扣券',
    desc: '购物时可抵用部分金额',
    expiryText: '有效期以平台规则为准'
  },

  onLoad(options) {
    const cachedMineHome = xgwAuth.getMineHome() || {}
    const queryPrice = safeStr(options && options.price).trim()
    const price = formatPrice(queryPrice || cachedMineHome.vouchers || '0')
    this.setData({ price })
  }
})
