/* @flow */

import { baseOptions } from './options'
import { createCompiler } from 'compiler/index'

// baseOptions 平台相关的options
const { compile, compileToFunctions } = createCompiler(baseOptions)

export { compile, compileToFunctions }
