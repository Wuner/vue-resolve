/* @flow */

import config from '../config'
import {initUse} from './use'
import {initMixin} from './mixin'
import {initExtend} from './extend'
import {initAssetRegisters} from './assets'
import {set, del} from '../observer/index'
import {ASSET_TYPES} from 'shared/constants'
import builtInComponents from '../components/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

// 注册vue的静态属性/方法
export function initGlobalAPI(Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  // 初始化 Vue.config 对象
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  // 注意：这些不被认为是公共API的一部分-除非您意识到风险，否则请不要依赖它们。
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  // 静态方法set/del/nextTick
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 初始化Vue.options对象，并对其扩展
  Vue.options = Object.create(null)
  // 遍历ASSET_TYPES取到component/directive/filter，添加到options中，并初始化为空对象
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  // 在Weex的多实例场景中，它用于标识“基本”构造函数以扩展所有纯对象组件。
  Vue.options._base = Vue
  // 设置 keep-alive 组件
  extend(Vue.options.components, builtInComponents)

  // 注册 Vue.use() 用来注册插件
  initUse(Vue)
  // 注册 Vue.mixin() 实现混入
  initMixin(Vue)
  // 注册 Vue.extend() 基于传入的options返回一个组件的构造函数
  initExtend(Vue)
  // 注册 Vue.directive()、 Vue.component()、Vue.filter()
  initAssetRegisters(Vue)
}
