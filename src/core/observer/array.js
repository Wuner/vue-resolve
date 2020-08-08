/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
// 使用数组的原型创建一个新的对象
export const arrayMethods = Object.create(arrayProto)

/**
 * Intercept mutating methods and emit events
 */
// 修改数组元素的方法
;[
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]
.forEach(function (method) {
  // cache original method
  // 缓存数组的原方法
  const original = arrayProto[method]
  // 调用Object.defineProperty()方法，重写数组的方法
  def(arrayMethods, method, function mutator (...args) {
    // 执行原数组的原方法，并改变其this指向
    const result = original.apply(this, args)
    // 获取数组对象的__ob__属性
    const ob = this.__ob__
    // 获取数组新增的元素
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    // 如果存在新增元素，重新遍历数组元素设置为响应式数据
    if (inserted) ob.observeArray(inserted)
    // notify change
    // 调用数组的ob对象发送更新通知
    ob.dep.notify()
    return result
  })
})
