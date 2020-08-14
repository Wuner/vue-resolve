/* @flow */

import { makeMap, isBuiltInTag, cached, no } from 'shared/util'

let isStaticKey
let isPlatformReservedTag

const genStaticKeysCached = cached(genStaticKeys)

/**
 * Goal of the optimizer: walk the generated template AST tree
 * and detect sub-trees that are purely static, i.e. parts of
 * the DOM that never needs to change.
 *
 * Once we detect these sub-trees, we can:
 *
 * 1. Hoist them into constants, so that we no longer need to
 *    create fresh nodes for them on each re-render;
 * 2. Completely skip them in the patching process.
 */
export function optimize (root: ?ASTElement, options: CompilerOptions) {
  if (!root) return
  isStaticKey = genStaticKeysCached(options.staticKeys || '')
  isPlatformReservedTag = options.isReservedTag || no
  // first pass: mark all non-static nodes.
  // 第一次通过：标记非静态节点。
  markStatic(root)
  // second pass: mark static roots.
  // 第二遍：标记静态根节点。
  markStaticRoots(root, false)
}

function genStaticKeys (keys: string): Function {
  return makeMap(
    'type,tag,attrsList,attrsMap,plain,parent,children,attrs' +
    (keys ? ',' + keys : '')
  )
}

function markStatic (node: ASTNode) {
  // 判断当前的astNode是否是静态的
  node.static = isStatic(node)
  // 元素节点
  if (node.type === 1) {
    // do not make component slot content static. this avoids
    // 1. components not able to mutate slot nodes
    // 2. static slot content fails for hot-reloading
    // 不要将组件插槽的内容设为静态
    // 1.组件无法更改插槽节点
    // 2.静态插槽内容无法进行热重装

    // 是组件，不是slot，没有inline-template，直接返回，阻止向下执行
    if (
      !isPlatformReservedTag(node.tag) &&
      node.tag !== 'slot' &&
      node.attrsMap['inline-template'] == null
    ) {
      return
    }
    // 遍历children
    for (let i = 0, l = node.children.length; i < l; i++) {
      const child = node.children[i]
      // 标记非静态
      markStatic(child)
      if (!child.static) {
        // 如果有一个child不是静态，设置当前节点不是静态
        node.static = false
      }
    }
    // 处理条件渲染
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        const block = node.ifConditions[i].block
        // 标记非静态
        markStatic(block)
        if (!block.static) {
          // 如果有一个block不是静态，设置当前节点不是静态
          node.static = false
        }
      }
    }
  }
}

function markStaticRoots (node: ASTNode, isInFor: boolean) {
  // 判断是否为元素节点
  if (node.type === 1) {
    // 判断当前节点是否是静态节点或者是否只渲染一次
    if (node.static || node.once) {
      // 标记其在for循环中是否是静态的
      node.staticInFor = isInFor
    }
    // For a node to qualify as a static root, it should have children that
    // are not just static text. Otherwise the cost of hoisting out will
    // outweigh the benefits and it's better off to just always render it fresh.
    // 如果一个元素内只有文本节点，此时这个元素不是静态的Root
    // vue 认为这种优化会带来负面的影响

    // 判断当前节点是静态节点，并且存在子节点，并且当前节点的子节点不能只存在一个文本节点
    // 如果不满足，优化成本将大于收益
    if (node.static && node.children.length && !(
      node.children.length === 1 &&
      node.children[0].type === 3
    )) {
      // 标记根节点为静态
      node.staticRoot = true
      return
    } else {
      // 标记根节点为非静态
      node.staticRoot = false
    }
    // 检测当前节点的子节点中是否有静态的Root
    if (node.children) {
      for (let i = 0, l = node.children.length; i < l; i++) {
        markStaticRoots(node.children[i], isInFor || !!node.for)
      }
    }
    // 检测当前节点的条件渲染中是否有静态的Root
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        markStaticRoots(node.ifConditions[i].block, isInFor)
      }
    }
  }
}

function isStatic (node: ASTNode): boolean {
  if (node.type === 2) { // expression 表达式
    return false
  }
  if (node.type === 3) { // text 文本
    return true
  }
  return !!(node.pre || (
    !node.hasBindings && // no dynamic bindings
    !node.if && !node.for && // not v-if or v-for or v-else
    !isBuiltInTag(node.tag) && // not a built-in 不能是内置组件
    isPlatformReservedTag(node.tag) && // not a component 不能是组件
    !isDirectChildOfTemplateFor(node) && // 不能是v-for下的直接节点
    Object.keys(node).every(isStaticKey)
  ))
}

function isDirectChildOfTemplateFor (node: ASTElement): boolean {
  while (node.parent) {
    node = node.parent
    if (node.tag !== 'template') {
      return false
    }
    if (node.for) {
      return true
    }
  }
  return false
}
