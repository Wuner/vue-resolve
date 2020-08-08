/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

// Object.getOwnPropertyNames()方法
// 返回一个由指定对象的所有自身属性的属性名（包括不可枚举属性但不包括Symbol值作为名称的属性）组成的数组。
const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * By default, when a reactive property is set, the new value is
 * also converted to become reactive. However when passing down props,
 * we don't want to force conversion because the value may be a nested value
 * under a frozen data structure. Converting it would defeat the optimization.
 */
export const observerState = {
  shouldConvert: true
}

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 */
export class Observer {
  // 数据对象
  value: any;
  // 依赖对象
  dep: Dep;
  // 实例计数器
  // 以该对象在根$data的vms数
  vmCount: number; // number of vms that has this object as root $data

  // 构造函数，初始化数据
  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    // 将实例挂载到观察对象的__ob__属性
    def(value, '__ob__', this)
    // 如果观察对象是一个数组，将数组转换为响应式数据
    if (Array.isArray(value)) {
      const augment = hasProto
        ? protoAugment // 改变数组当前对象的原型属性
        : copyAugment // 改变数组当前对象的原型属性
      // arrayKeys是对象的所有自身属性的属性名组成的数组
      augment(value, arrayMethods, arrayKeys)
      // 为数组中的每一个对象元素创建一个observer实例
      this.observeArray(value)
    } else {
      // 遍历对象中的每一个属性，转换成getter/setter
      this.walk(value)
    }
  }

  /**
   * Walk through each property and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    // 获取对象里的所有属性
    const keys = Object.keys(obj)
    // 遍历每一个属性，设置为响应式数据
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object, keys: any) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
// 如果不存在观察者实例，则创建观察者实例，并返回
// 存在，则直接返回现有的观察者实例
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 如果value不是一个对象或者value是一个虚拟dom，则不往下执行，即不需为其转换为响应式数据
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // 如果value中存在__ob__属性，并且__ob__是Observer，则直接将value.__ob__赋值给ob
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    observerState.shouldConvert &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    // observerState.shouldConvert为true
    // 并且当前是浏览器环境
    // 并且value是一个数组或者是'[object Object]'
    // 并且value是可扩展的（可以在它上面添加新的属性）
    // 并且value不是Vue实例
    // 创建一个Observer对象，并赋值给ob
    ob = new Observer(value)
  }
  // 如果处理的是根数据并且存在ob，则ob.vmCount++
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
// 在对象上定义响应式属性
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 创建依赖对象实例，其作用是为当前属性(key)收集依赖
  const dep = new Dep()

  // 获取obj对象的属性描述符
  const property = Object.getOwnPropertyDescriptor(obj, key)
  // 当且仅当该属性的 configurable 键值为 true 时
  // 该属性的描述符才能够被改变，同时该属性也能从对应的对象上被删除。
  // 如果存在属性描述符，并且configurable为false，即不可被转换为响应式数据，则不继续往下执行
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  // 提供预定义的存取器函数
  const getter = property && property.get
  const setter = property && property.set

  // 当shallow为false或者不存在时
  // observe会判断val是否是递归观察子对象
  // 并将对象属性都转换为getter/setter，返回子观察对象
  let childOb = !shallow && observe(val)
  // 当且仅当该属性的 enumerable 键值为 true 时，该属性才会出现在对象的枚举属性中。
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // 如果存在用户设置的getter，将getter的this指向obj，并赋值给value
      // 否则直接将传入的val赋值给value
      const value = getter ? getter.call(obj) : val
      // 如果存在当前依赖目标，即watcher对象，则建立依赖
      // 在src/core/observer/index.js中的mountComponent方法，创建了watcher对象
      // 在watcher对象的构造函数中，创建了Dep.target
      if (Dep.target) {
        // 为当前属性收集依赖
        dep.depend()
        // 如果存在子观察对象，则建立子对象的依赖关系
        if (childOb) {
          // 为当前子对象收集依赖
          childOb.dep.depend()
          // 如果value是数组，则特殊处理收集数组对象依赖
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      // 返回属性值
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      // 如果新值等于旧值或者新值和旧值都为NaN，则不继续往下执行
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      // 如果传入customSetter参数时，并且在非production环境时，调用customSetter方法
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // 如果存在用户设置的setter，则将setter的this指向obj，并将newVal传入
      // 否则直接newVal赋值给val
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 当shallow为false或者不存在时
      // observe会判断newVal是否是是递归观察子对象，返回子观察对象
      childOb = !shallow && observe(newVal)
      // 派发更新(发布更新通知)
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  // 如果目标是数组，并且key 是合法的索引
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    // 通过Math.max返回最大值，并赋值给target.length
    target.length = Math.max(target.length, key)
    // 通过 splice 对key位置的元素进行替换
    // splice 在 src/core/observer/array.js中进行了响应式的处理
    target.splice(key, 1, val)
    return val
  }
  // 如果target中已存在key属性，则直接赋值
  if (hasOwn(target, key)) {
    target[key] = val
    return val
  }
  // 获取 target 中的 observer 对象
  const ob = (target: any).__ob__
  // 如果target是vue实例或者是$data，则直接返回
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  // 如果不存在ob，那么target 不是一个响应式对象，则直接赋值并返回
  if (!ob) {
    target[key] = val
    return val
  }
  // 把 key 设置为响应式属性
  defineReactive(ob.value, key, val)
  // 发送更新通知
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  // 如果目标是数组，并且key 是合法的索引
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    // 通过 splice 对key位置的元素进行删除
    // splice 在 src/core/observer/array.js中进行了响应式的处理
    target.splice(key, 1)
    return
  }
  // 获取 target 中的 observer 对象
  const ob = (target: any).__ob__
  // 如果target是vue实例或者是$data，则直接返回
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  // 如果target不存在key属性，则直接返回
  if (!hasOwn(target, key)) {
    return
  }
  // 删除target的key属性
  delete target[key]
  // 如果不存在ob，那么target 不是一个响应式对象，则直接返回
  if (!ob) {
    return
  }
  // 发送更新通知
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
