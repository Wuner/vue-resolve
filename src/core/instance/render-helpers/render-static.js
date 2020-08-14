/* @flow */

import { cloneVNode, cloneVNodes } from 'core/vdom/vnode'

/**
 * Runtime helper for rendering static trees.
 * 运行时，用于渲染静态抽象语法树
 */
export function renderStatic (
  index: number,
  isInFor?: boolean
): VNode | Array<VNode> {
  // static trees can be rendered once and cached on the contructor options
  // so every instance shares the same cached trees
  // 静态树可以渲染一次并缓存在构造器选项上,每个实例共享相同的缓存中的静态树
  const renderFns = this.$options.staticRenderFns
  const cached = renderFns.cached || (renderFns.cached = [])
  let tree = cached[index]
  // if has already-rendered static tree and not inside v-for,
  // we can reuse the same tree by doing a shallow clone.
  // 如果已经渲染了静态树而不是在v-for内部，
  // 我们可以通过执行浅复制来重用同一棵树。
  if (tree && !isInFor) {
    return Array.isArray(tree)
      ? cloneVNodes(tree)
      : cloneVNode(tree)
  }
  // otherwise, render a fresh tree.
  // 否则，渲染一棵新的树
  tree = cached[index] = renderFns[index].call(this._renderProxy, null, this)
  markStatic(tree, `__static__${index}`, false)
  return tree
}

/**
 * Runtime helper for v-once.
 * Effectively it means marking the node as static with a unique key.
 */
export function markOnce (
  tree: VNode | Array<VNode>,
  index: number,
  key: string
) {
  markStatic(tree, `__once__${index}${key ? `_${key}` : ``}`, true)
  return tree
}

function markStatic (
  tree: VNode | Array<VNode>,
  key: string,
  isOnce: boolean
) {
  if (Array.isArray(tree)) {
    for (let i = 0; i < tree.length; i++) {
      if (tree[i] && typeof tree[i] !== 'string') {
        markStaticNode(tree[i], `${key}_${i}`, isOnce)
      }
    }
  } else {
    markStaticNode(tree, key, isOnce)
  }
}

function markStaticNode (node, key, isOnce) {
  node.isStatic = true
  node.key = key
  node.isOnce = isOnce
}
