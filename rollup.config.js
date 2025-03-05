import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
  input: 'queue.js',
  output: {
    file: 'queue.mjs',
    format: 'esm',
    sourcemap: true
  },
  plugins: [nodeResolve(), commonjs()]
}
