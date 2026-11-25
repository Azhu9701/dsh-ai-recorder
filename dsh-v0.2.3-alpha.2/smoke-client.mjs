// 冒烟测试：在 Node 里模拟浏览器模块装载器，确认 client 半边能注册并物化出插件。
import { createRequire } from 'node:module'

const require_ = createRequire(import.meta.url)
const calls = []
globalThis.window = { __ModuleLoader__: { load: (def) => calls.push(def) } }
globalThis.document = { currentScript: null, querySelectorAll: () => [] }

await import('./lib/client.js')

const def = calls[0]
const exports = def.factory(require_)

console.log(JSON.stringify({
  loadCalls: calls.length,
  registeredId: def.id,
  exportedKeys: Object.keys(exports),
  apply: typeof exports.apply,
  inject: exports.inject,
}, null, 2))