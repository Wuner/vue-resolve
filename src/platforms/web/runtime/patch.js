/* @flow */
// nodeOps里是各种DOM操作函数
import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
// 指令和钩子函数
import baseModules from 'core/vdom/modules/index'
// DOM节点的属性/事件/样式的操作
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
// 合并指令和钩子函数和DOM节点的属性/事件/样式的操作
const modules = platformModules.concat(baseModules)

export const patch: Function = createPatchFunction({ nodeOps, modules })
