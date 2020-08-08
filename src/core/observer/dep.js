/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
export default class Dep {
  // 静态属性，Watcher对象
  static target: ?Watcher;
  // dep实例id
  id: number;
  // dep实例对应的Watcher对象/订阅者数组
  subs: Array<Watcher>;

  // 构造函数，初始化数据
  constructor () {
    this.id = uid++
    this.subs = []
  }

  // 添加新的订阅者Watcher对象
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  // 移除订阅者Watcher对象
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  // 将观察对象和Watcher对象建立依赖
  depend () {
    // 如果存在target，则把dep对象添加到watcher的依赖中
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  // 发布通知
  notify () {
    // stabilize the subscriber list first
    // 克隆数组
    const subs = this.subs.slice()
    // 调用每个订阅者的update方法实现更新
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// Dep.target 用来存放目前正在使用的watcher
// 全局唯一，并且一次也只能有一个watcher被使用
// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
Dep.target = null
const targetStack = []

// 入栈并将当前 watcher 赋值给Dep.target
export function pushTarget (_target: Watcher) {
  // 每一个组件都有一个mountComponent函数
  // mountComponent函数创建了watcher对象
  // 所以每一个组件对应一个watcher对象
  // 如果A组件嵌套B组件，当我们渲染A组件时，发现存在子组件，则先渲染子组件，将A组件渲染挂起
  // 所以这里需要将A组件的Dep.target入栈
  // 当子组件渲染结束后，将其弹出栈，并继续执行A组件渲染
  // 总结：
  // 父子组件嵌套的时候先把父组件对应的watcher入栈，再去处理子组件的watcher。
  // 子组件处理完毕后，再把父组件对应的watcher出栈，继续操作
  if (Dep.target) targetStack.push(Dep.target)
  Dep.target = _target
}

// 出栈操作
export function popTarget () {
  Dep.target = targetStack.pop()
}
