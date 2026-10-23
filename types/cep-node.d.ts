/**
 * CEP 开了 `--enable-nodejs` 后注入到页面全局的 Node `process`（第三方边界，硬规则 20(a)）。
 *
 * 为什么不写进 `src/env.d.ts`：那份 d.ts 会被 `tsconfig.tests.json` 一起编译，而 tests 里有
 * `@types/node` 的 `declare var process: NodeJS.Process`——同名的另一份 `declare var` 会顶掉它，
 * 实测 `tests/cep/setd-router.test.ts:15`、`tests/components/base-group.test.ts:64`、
 * `tests/components/cep-modal.test.ts:4` 的 `process.cwd()` 全部报 TS2339。
 * 所以这份只给 `src` 程序（`tsconfig.json` 的 include），tests 继续用 `@types/node`。
 *
 * 只声明我方真正用到的两个字段：`env`（`fs.ts` 的 `userDir`）、`pid`（`fs.ts` 的 `uniqueTmpPath`，D-42）。
 * 写成必填是**故意的**：两处调用点都先过 `nodeRequire` / `hasNode()`，Node 不在就到不了那里。
 */
interface CepNodeProcess {
  pid: number
  env: Record<string, string | undefined>
}

// 全局声明只能用 `var`：`declare const` 不会出现在 `globalThis` 上（实测 `globalThis.process` 报 TS2339）
// eslint-disable-next-line no-var
declare var process: CepNodeProcess
