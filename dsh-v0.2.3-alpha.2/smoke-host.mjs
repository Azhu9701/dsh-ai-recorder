// 冒烟测试：用最小假 ctx 跑一遍 host 半边的 apply()，确认能加载、能注册路由与工具。
// 不连真实 DSH：只覆盖「模块能加载 + apply 不抛 + 关键注册发生」这三件事。
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const mod = await import('./lib/index.js')
const routes = []
const tools = []
const effects = []

const ctx = {
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
  webServer: {
    register: (route) => { routes.push(route); return () => {} },
  },
  effect: (fn) => {
    effects.push(fn)
    const dispose = typeof fn === 'function' ? fn() : undefined
    return typeof dispose === 'function' ? dispose : () => {}
  },
  get: (name) => {
    if (name === 'tools') return { register: (def) => { tools.push(def); return () => {} } }
    return undefined
  },
  on: () => () => {},
  emit: () => {},
}

const outDir = mkdtempSync(join(tmpdir(), 'rec-smoke-'))
const config = mod.Config({ outDir, token: 'smoke-token' })

mod.apply(ctx, config)

const paths = routes.map((r) => `${r.kind}:${r.path}`)
const authKind = typeof routes[0]?.auth
const decision = typeof routes[0]?.auth === 'function'
  ? routes[0].auth({ headers: { 'x-recorder-token': 'smoke-token' } })
  : routes[0]?.auth
const decisionBad = typeof routes[0]?.auth === 'function'
  ? routes[0].auth({ headers: { 'x-recorder-token': 'wrong' } })
  : undefined

console.log(JSON.stringify({
  exported: { name: mod.name, inject: mod.inject, hasApply: typeof mod.apply, hasConfig: typeof mod.Config },
  paths,
  authSelector: authKind,
  authForMatchingToken: decision,
  authForWrongToken: decisionBad,
  toolNames: tools.map((t) => t.name),
  toolParametersIsJsonSchema: tools[0]?.parameters?.type,
  toolOutputRender: typeof tools[0]?.output?.render,
  effectCount: effects.length,
}, null, 2))

process.exit(0)