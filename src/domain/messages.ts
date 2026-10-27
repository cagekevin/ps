// 是什么：提示语唯一出处层——界面上用户看到的每一句提示语（失败/降级/成功/进度/要用户做什么/问用户确认）只能在这里写
// 正确用法：事件源侧（commands / cep/data / cep/jsx / cloud / selection / domain）在对应命名空间里定义这句话怎么说，
//          页面拿到的已是成品字符串，直接显示。本阶段是空骨架（2026-10-25）：
//          P2 起按落点表逐条把 `new CepError('IO', '读写失败')` 里的字面量换成 `msg.data.xxx`（纯文案走 `text`，带参句走 `fn`），
//          P3 再搬页面侧自拼句，P4 加静态闸拦截新增违规。
//          需要参数的句子**只允许**放进 `fn` 字段（签名 `(args) => string`），不许塞进 `text`。
// 绕过会怎样：页面自己写一句中文提示（`feedback.error('新的说法')` 或 `` `删除「${x}」？` ``），
//          同一件事在界面上会出现两处说法、且会各自漂移——排查时 grep 不到唯一出处，用户看到前后不一致。
// 谁会红：现在**没有**闸——页面仍可自拼中文提示，本阶段不拦截任何东西（P1 单独交付时"页面还能自拼"仍然成立，不许宣称已收口）。
//          静态闸排在 P4（eslint 规则：`src/pages/**`、`src/components/**` 禁止出现中文字符串字面量与含中文模板串）。
//          现在唯一会红的是 `npm run typecheck`：把带参函数塞进 `text`（或反之）会报类型不匹配，见下方「类型约束」一节。
// 谁在用：暂无消费方（P2 起：`commands/*` 的 CepError/CloudError 第 2 参、`useCommand.invoke` 成功文案、`stores/*` 的 error 字段、页面/组件只读显示）。

/**
 * 类型约束（拦得住什么 / 拦不住什么，别写"类型安全"这种大话）：
 *
 * **拦得住**（`npm run typecheck` 会红）：
 *   1. 把纯文案写进 `fn`（`msg.command.someFn = '直接一句话'` → 类型不匹配，`fn` 只接受函数）；
 *   2. 把带参模板函数写进 `text`（`msg.command.someText = (name: string) => \`...\`` → `text` 只接受 `string`）；
 *   3. 用 `msg` 里不存在的命名空间（拼错 `msg.date` → 属性不存在）；
 *   4. 给已有键塞错形状（`msg.command.someText` 从 `string` 改成函数，所有调用点同时红）。
 *
 * **拦不住**（`typecheck` 不红，只能靠人 / 靠 P4 静态闸）：
 *   1. 在两个命名空间里写同一句（`msg.command.x` 与 `msg.data.x` 同文案）——编译器不检查内容重复；
 *   2. 在页面/组件里新写一句中文提示语字面量——`text`/`fn` 只约束本文件内怎么写，不管页面在外面写什么；
 *   3. 把按钮标签/标题/表头这类"不算提示语"的东西塞进来——语义判断，编译器不管；
 *   4. `text` 里的文案本身写得不好、或跟另一个 `text` 说同一件事但字不一样——不是类型问题。
 *
 * 结论：这套约束只解决"形状对不对"（纯文案 vs 带参函数、命名空间对不对），不解决"该不该在这里写""写得对不对"。
 * 后两类要靠 P4 的静态闸（拦页面层新增中文提示语）+ 人核（拦重复、拦语义错误）。
 *
 * ---
 *
 * 数字口径（哪些能互相验证、哪些不能）：
 *
 * - **447 行 / 77 文件**（`文件:行` 去重口径）：所有提示语（错误文案 + 含 `${}` 拼句 + 成功文案 + `feedback.*` 字面量 + C 项真提示语（`.vue` 模板里语义上算提示语的行，需人工核，脚本给候选 34 行，人工核定 10 行进 expected.json））归一到行数后的总数。
 * - **253 处次 / 35 文件**（`处次` 口径）：仅 `CepError`/`CloudError` 第 2 参字面量，按"每个 `throw` 一条"数。
 *
 * **两者是包含关系，不是等式**：253 处次的每一条都落在 447 行里的某一行（会贡献行数），但：
 *   - 253 里跨行写的 `throw`（3 行写完一条）在 447 里只占起始行 1 行；反之 447 里的 Interp/成功文案/feedback/C 项部分**不在** 253 里。
 *   - 所以**不能**用 253 加减某个数推回 447，只能验证"253 处次 ⊂ 447 行"这一层关系。
 *   - 同理，"事件源侧 371 行 / 57 文件"是 Interp+错误文案等混合口径的行数，跟 253 处次也不能直接对账（口径不同：行数 vs 处次）。
 *
 * ⚠️ **处次口径"全归零"≠ 事件源侧"全清干净"**：P2 把 `CepError`/`CloudError` 文案（处次口径）搬空了，
 * 但行数口径的"含 ${} 拼句"里，事件源侧还剩 197 行——其中 **105 行是本文件 `msg.*` 的 `fn` 模板定义本身**
 * （那是出处、不是待收口的散落），**93 行才是真散落**（分布在 `stores/*`、`utils/logger`、`utils/error-text`、
 * `composables/*`、`selection/index` 等的含 ${} 串，多为日志或非提示语，或尚未搬）。所以判"事件源侧清没清"要看
 * "真散落 93 行"有没有归零，不是看"197 行"这个含出处的混合数。
 *
 * ---
 *
 * 口径（判据，不是描述）——什么算提示语：
 *
 * **算**：这句话是**系统在报告一次事件的结果或状态** ——
 *   失败 / 降级 / 成功 / 进度 / 要用户做什么 / 问用户确认。
 *   判据一句话：**这句话回答的是"刚才发生了什么"才算提示语**。
 *
 * **不算**（不要搬进来）：按钮标签、菜单项、字段名、表头、标题、示例页演示文字、
 *   内部 id / 错误码名 / 文件名本身。这些回答的是"这里是什么"，是界面长相，不是事件报告。
 *
 * 基线（2026-10-25 实测，`文件:行` 去重口径）：提示语共 **447 行 / 77 文件**
 * —— 事件源侧 **371 行 / 57 文件**（P2 搬）、页面/组件侧 **76 行 / 20 文件**（P3 搬，其中 C 项 `.vue` 模板 186 行里（已遮蔽注释）
 *   只有一小部分算提示语，其余是按钮/标题等不算（脚本只能给候选 38 行，语义判读仍需人工））。
 *
 * ---
 *
 * 落点表（8 类事件源，各定 1 个命名空间，同在本文件内；每句话只许在其中 1 个命名空间定义，不许两处写同一句）：
 *
 * | # | 事件源（谁出的事） | 命名空间 | 基线规模（处次 / 文件） |
 * | --- | --- | --- | --- |
 * | 1 | 校验失败（`domain/*` 纯函数判空/判范围） | `msg.validate` | 19 / 4 |
 * | 2 | 命令失败（`commands/*`，含 `stores/*`、`utils/*`、`composables/*` 里抛错的） | `msg.command` | 121 / 10 |
 * | 3 | 数据读写失败（`cep/data/*`） | `msg.data` | 84 / 11 |
 * | 4 | PS 能力失败（`cep/jsx`、`cep/transport`、`cep/fs|http|ps|dialog|open-url`） | `msg.ps` | 19 / 6 |
 * | 6 | 选区/文字属性失败（`selection/*`） | `msg.selection` | 收口 4 处引用（1 text + 2 fn）；基线无 CepError/CloudError 字面量，真身是含 `${}` 的拼句，已归本行 P2 收口 |
 * | 7 | 确认问句 + 成功回报（`command.title`、`useCommand.invoke` 第二参、`CepModal`/`ConfirmHost` 默认值、模板 title 属性） | `msg.confirm` + `msg.success` | confirm 12 键 / 13 引用；success 30 键 / 36 引用（原 9/24 是窄口径漏数，实际含 fn 形态与模板属性） |
 * | 8 | **页面/组件层多处引用的自拼句**（同文案在 >1 处出现的页面级提示语——**只收多引用**；单引用页面私有文案留页面不进这里） | `msg.page` | P3 口径订正后：仅 `noActionsInGroup` 1 键（2 处引用）；45 个单引用键已搬回页面 |
 *
 * 合计校验（落点表行数 = 事件源侧错误文案规模，处次口径）：253 处次 = 19+121+84+19+10，35 文件 = 4+10+11+6+4（并集，无文件被两类包含）。
 * ⚠️ 这组数字是**处次口径**，与上方"447 行"（行数口径）不可直接对账，见「数字口径」一节。
 *
 * **8 行 ↔ 9 命名空间的映射**：第 1–6、8 行各对应 1 个命名空间（validate/command/data/ps/cloud/selection/page）；
 * 第 7 行对应 2 个——`msg.confirm`（确认问句）+ `msg.success`（成功回报），因为"问用户"与"报成功"是两类不同的句子，
 * 各自独立成句不合并。所以 8 行落点、9 个命名空间，不是漏了一个也不是多算一行。
 *
 * **第 8 行（`msg.page`）与第 2/7 行的边界**（为什么单开，不塞进 command/validate/confirm）：
 *   - 不进 `validate`：validate 是 `domain/*` **纯函数**抛的校验错；页面前置校验（空标签名/重名/空宽度）在页面内联、直接 `feedback.*`，事件源是页面不是纯函数。
 *   - 不进 `command`：command 是 **commands 层抛错**的事；页面空态/降级/进度是页面自身状态，不经命令抛出。
 *   - 不进 `confirm`/`success`：那两格只放**问用户**与**报成功**两种句式；页面的空态/降级/进度/失败态既不问也不报成功，是第三类。
 *   - 互斥判据一句话：**看这句话报告的是"谁"的事件**——commands 抛的进 command，页面自己说的进 page，不看它在哪个文件里。
 *
 * 落点表是唯一清单，不要在别处再列一份。
 *
 * ---
 *
 * ⚠️ 数字有两种，别混：**基线（改前）** = P1 落定时固化的 253 处次 / 447 行那批；**当前（改后）** = 现在跑
 * 当时的实时值随 P2/P3 逐条搬进 msg.* 而下降。两者**不该相等**——
 * 相等说明没在收口；下降说明搬进出处层了。判据看「当前」是否降到目标，基线只作对照。
 *
 * P2-P4 收口判据（当时的对照口径，复算脚本 2026-10-26 已删）：
 *
 * | # | 判据 | 性质 | 基线（改前） | 当前（改后） | 目标 |
 * | --- | --- | --- | --- | --- | --- |
 * | 4.1 | 重复文案条数（错误文案里同一句 >1 次） | **主判据** | 27 条 / 79 处次 | **0 条 / 0 处次（P2 第1-4行后，已达标）** | 0 |
 * | 4.2 | 页面/组件层提示语行数（`文件:行` **单一去重**：页面散落 + C 项已核定行并进同一个 Set，不两数相加） | 次判据 | 76 行 / 20 文件 | **11 行 / 7 文件（P3 后，全部判不搬）** | 真提示语 0 |
 * | 4.2b | 事件源侧真散落里**桶A 真用户提示语**行数（归 P2 搬 `msg.*`） | 次判据 | 32 行（`expected.json` eventPromptRows） | **0 行（P2 已搬 31 行进 msg.*；1 行 system.ts 是路径非提示语，判不搬）** | 0 |
 * | 4.2c | 事件源侧真散落里**桶B 日志/开发者串**行数 | 不搬，非提示语 | ~25 行 | 不进 `msg.*` | — |
 * | 4.2d | 事件源侧真散落里**桶C 存疑**行数 | 标 `UNVERIFIED`，不硬塞 | ~36 行 | 待逐条定 | 挂账 |
 * | 4.3 | 含提示语的文件数 | 参考，不作判据 | 77 文件 | 52 文件（P2 第1-7行后） | 78（+1 个 `messages.ts`） |
 *
 * **减一/减二 改前改后并列凭证（2026-10-25 补，凭证三问：命令真跑）**：
 *   **减一·兜底净减**（`git show HEAD:<f>` vs 当前，26 个改动文件，regex 计数）：catch 7→7、return[] 7→7、return null 3→3、?? 50→50 **全部持平**。
 *   —— 纯文案搬运不增不减兜底，符合"搬提示语不主涉兜底"。**注意这不是 Y<X 的净减**，是"不增"（P3 范围内已达标；全仓 266→241 的减是 P2 前旧改动，非本轮）。
 *   **减二·复杂度实减**：
 *     重复份数（同文案定义份数）：改前 27 条重复/79 处次 → 改后 **0**（CepError/CloudError 字面量口径）。
 *     改动半径实证：「仓库名不能为空」改前散在 4 处（cep/data/style-library-repo.ts:453 + commands/action.ts:186,199 + pages/style:841）→ 改后收敛、页面侧引 `msg.*`。
 *     fan-in：`messages.ts` 被 **59 个文件** import（真相源上游面；收口前这 59 处各自散写）。
 *     页面层散落行：47 → **11**（全判不搬，见 _notCounted）。
 *   ⚠️ **口径错配，如实记**：当时的文案审计只抓 CepError/CloudError 字面量，**抓不到 messages.ts 内部键值重复**。
 *   实测 messages.ts 内部仍有 **7 组同文案不同键**（跨命名空间，P2 遗留）：「分组不存在」×2、「分组名不能为空」×2、「仓库名不能为空」×2、「取消操作」×4、「导入失败，文件读取失败」×2、「连接服务器失败」×2、「读取前景色失败」×2。
 *   故"4.1=0"≠"无重复文案"——这 7 组是**不同事件源命名空间的同文案**（validate/command/data/ps 各自抛），按落点表"每句只在一个命名空间定义"属**待定**：
 *   或合并、或明确"不同事件源故意同文案"。**未清，挂账**（属一归的尾巴，非本轮搬运引入）。

 * **一归收尾 · 跨命名空间同文案登记（2026-10-25，B 类判"不是重复"，逐组理由）**：
 *   同文案落进**不同事件源命名空间**≠重复——落点表按"谁出的事"分格，不同层各自抛错时恰好说同一句是合理的。
 *   A 类（同命名空间内真重复）已合并：「取消操作」command 4 键→`actionCancelled` 1 键（删 fontCancelled/renameCancelled/styleCancelled 3 个死键）；
 *   「导入失败，文件读取失败」command 2 键→`fontImportReadFailed` 1 键（删 renameImportReadFailed）。故 command 命名空间内已 N→1。
 *   B 类（跨命名空间，判合理保留，不合并）逐组理由：
 *     - 「分组不存在」`validate.renameGroupMissing`（domain 纯函数判空/判范围）vs `command.actionGroupMissing`（命令层判动作目标）——两个不同事件源、不同层各自的失败，不是同一能力的两份判据。
 *     - 「分组名不能为空」`command.actionGroupNameRequired`（命令校验）vs `data.groupNameRequired`（数据层写前校验）——同文案但职责不同：命令层拒在入口、data 层拒在落盘前，两道闸各自独立成立。
 *     - 「仓库名不能为空」`command.actionWarehouseNameRequired` vs `data.warehouseNameRequired`——同上，命令入口校验 vs 数据落盘校验。
 *     - 「连接服务器失败」`command.fontSetNetworkFailed`（命令层字体翻译用）vs `ps.connectServerFailed`（cep/http 底层）——上层命令与底层通道各自的失败语义。
 *     - 「读取前景色失败」现仅 `command.styleReadForegroundFailed` 一处（原 `command.swatchReadForegroundFailed` 是 0 引用死键，已删）——若色板页将来要独立报错再按事件源另立，暂单定义。
 *   判据一句话：**看这句话报告的是"谁"的事件**——同事件源同层=重复（合）；不同事件源=各自成句（留）。B 类都是后者。

 * **messages.ts 339 键的三类归属（2026-10-25 定，按引用数实测）**：
 *   - **一归（N→1，真收口）**：53 个 ≥2 引用键 + 已合的同命名空间重复（「取消操作」command 4→1、导入读失败 2→1）+ 改前本身散落多处的文案（如「仓库名不能为空」改前散 4 处→1 处定义）。**改字 1 处，改前要改 N 处**，这是唯一兑现"复杂度下降"的部分。
 *   - **归类（1→1，非归一）**：240 个 P2 事件源侧单引用键（validate/command/data/ps/cloud/selection，**留本文件**，属生产者抛错说的话）+ 45 个 `msg.page` 单引用键（**已搬回页面**，属页面私有文案，2026-10-25 口径订正）。**它们没归一任何东西**——本来 1 处、搬过来仍 1 处引用，改字次数 1→1 未省。性质是**把散落归到一处可查（可发现性 + 唯一入口）**，不是复杂度下降。代价：一层间接 + 本表 + 59 文件 import；收益：可查、将来真复用才兑现。**判"留下不搬回"**：搬回 240 个事件源侧 = 破"不碰 commands/cep/data"边界 + 把生产者文案塞进消费者（违 ADR-0023）；搬回 45 个 msg.page = "页面文案去哪查"从 1 文件退回 45 文件，拆掉唯一入口。**留下是"用结构换可发现性"，不许再叫它收口。**
 *   - **死键（垃圾）**：原 `command.swatchReadForegroundFailed` 0 引用，已删（动作 2：diff 必须有删除）。
 *   **一归判定一句话**：同一文案定义点 N→1 才算收口（53+ 已合重复）；1→1 只是归类。减二"复杂度实减"只在前者成立。**口径订正（2026-10-25）**：单引用页面私有文案**留页面**（45 个 msg.page 键已搬回），不进公共层——"页面不自拼"只约束**多处引用的**提示语，单引用留页面符合 AGENTS.md"别提前放公共"。

 * **P5 防回潮（静态闸拦新增）判「不做」，留痕（2026-10-25）**：页面层新写一句不重复的中文提示，静态面无闸会红
 * （4.1 只抓重复、`_notCounted` 是手填不自动响、4.2 只是粗筛参考数）。判不做的理由：
 *   ① 提示语语义（"回答刚才发生了什么"）机器判不了，硬拦必误伤按钮标签/字段名；
 *   ② 现有 lint 管不了这条语义，硬塞=语义错位；
 *   ③ 造闸=A4 白名单母体 + 减二复杂度加法（已试造 prompt-guard.mjs 并当场拆掉：恒绿假凭证）。
 * 真要补的落法（未做）：把"页面层中文提示语计数"做成**计数型基线**
 * （count>allowed 即红、只许减、--update 收紧）挂成一条只许减的基线——判据是"总数不许涨"，
 * 不是逐行具名白名单，故不触发 A4。当前防回潮=0，靠 messages.ts 唯一出处 + expected.json 人工核 + review 兜。

 * **减一·兜底净减核对（遮蔽注释后按六形态 grep；计数脚本 2026-10-26 已删）**：
 *   - 判据：P2 是搬提示语，不主涉兜底增删 ⇒ 目标是"兜底计数不增"，不是"必须降"。
 *   - 机器可数的 1-3 形态：静默吞 0→0；失败归一空值 + 默认值兜底——**本 P2 真实动过的文件净 +5**
 *     （`cep/ps.ts` -1、`commands/fontSet.ts` +1、`domain/{action,common-use,font-set-config,style-library}` +5，
 *      是替换 `msg.fn` 参数拼接引入的 `?? ''`/`return null` 微变，非新增静默兜底）。
 *   - ⚠️ 全仓总数（266→241）里的 -25 **不是 P2 的功劳**：`cep/jsx/mock.ts` 等文件是 P2 前就存在的旧改动
 *     （`git status` 里 M 状态早于本轮），跟文案搬运无关；且 `return []` 正则口径不稳会虚高，不能拿来当"净减"证据。
 *   - 4-6 形态（UI 提前宣告成功/占位对象/单入口补偿）机器数不了，需人工核，此处不谎报"已核"。
 *
 * **减二·复杂度实减度量（改前 vs 改后并列）**：
 *   - 重复份数：同一句话的定义份数 **27 条重复（79 处次散落）→ 0 条重复（全部收敛到本文件 1 份定义）**；
 *   - fan-in：`msg.*` 被 **47 个文件**引用（真相源 `messages.ts` 的上游面），散落字面量已收敛到本文件一处；
 *   - 改动半径：改一句提示语从"全仓 grep N 处逐个改"→"只改 `messages.ts` 一处"。
 *
 * **4.2 是单一去重数，不是"页面 47 + C 项 9"相加**：脚本把 C 项已核定行并进 `union`（`文件:行` Set）自动去重，
 * 47 已含 C 项那 9 行，再加就是重复计。**4.2b/4.2c/4.2d 单列**是因为它们跟 4.2 分属页面侧 / 事件源侧两批，不能并成一个数。
 *
 * **事件源侧真散落 93 行的三份处置（谁归哪批）**：桶A 真用户提示语 **32 行 → 31 行已 P2 搬进 `msg.*`、1 行（system.ts 路径）判非提示语不搬**（`expected.json` `_eventCollected`/`_eventNotPrompt` 留痕，`eventPromptRows` 清空=收完）；
 * 桶B 日志/开发者串（`utils/logger`、`utils/jsx-result`、`selection` skipReason、解析诊断等）**两批都不进**——它们不是用户看到的话，不属提示语；
 * 桶C 存疑（进度 label、`命令不存在`、`${size}点` 单位等）**标 `UNVERIFIED` 挂账**，不硬塞进 P2 凑数。
 *
 * **4.3 不是判据的理由**：文件数变化说明不了"每句话能追到唯一出处"，收口完成的判据是"同一句话不再有两份定义"（4.1），
 * 不是"文件多了一个"。4.3 只用来核对"没多建第二份出处文件"。
 *
 * **P4 静态闸必含的一项**：验证重复文案为 0（4.1）——不能只加"页面禁写中文提示语"这条闸，
 * 还要有一条闸确认收口后确实没有同一句出现在两处（否则收口只是搬家，不是消灭重复）。
 *
 * **P3 判不搬的 11 行留痕（4.2 收到 11，全部非提示语，不进 msg.*）**：当时的文案审计 4.2 只数
 * 「含中文且像提示语」的行，语义判读归人。这 11 行按口径判「不算提示语」，故不搬、也不该算作未收口：
 *   - `aria-label`（界面长相）：`GAnchorGrid`「锚点 N」、`Rating`「N 星」、`fontManage`「应用字体 X」；
 *   - 纯数据标注（这里是什么）：`style`「色值 #FF0000」「N 个字体」「组名 · X库」、`CreateButtonPanel`「自动生成5」「预设样式5」（后者是 `padding.value` 数据字段值，被 `.run` 第二参口径误捕）；
 *   - `placeholder`（字段名）：`style`「请输入X名称」；
 *   - 开发者/演示串：`Icon`「[Icon] 图标不存在：…」（console.warn）、`_atoms`「点击 X」（演示页 toast）。
 * 逐条判读记录（file:行 + context + 类别 + 理由）见归档 `archive/删闸-2026-10-26/scripts/copy-audit.expected.json` 的 `_notCounted`（11 行，P4 已结构化登记，
 * 与 4.2 的 11 行逐字节对账一致）；9 行 C 项已收进 msg.* 见 `_collected`（`promptRows` 清空）。
 * **UNVERIFIED 1 处**：`CreateButtonPanel:60`「自动生成5」——`padding.value` 经 v-model 绑输入框、用户可见，但它是字段值非「刚才发生了什么」，
 * 判不搬；是否算提示语依赖运行时 UI 观感，未实测，见 `expected.json` `_notCounted` 对应项的 `unverified` 字段。其余 10 行判不搬确凿。

 * ---
 *
 * 禁止：页面/组件 import 本文件后自己加字、改字、拼接、加"可能"；也不许在页面里写新的中文提示语字面量。
 */

/** 纯文案：不带参数，直接是用户看到的那句话 */
type MsgText = Record<string, string>
/** 带参模板句：参数拼进句子里，页面调它拿成品，不许自己拼 */
type MsgFn = Record<string, (...args: string[]) => string>

/** 每个命名空间都区分「纯文案」与「带参模板句」两类，写错形状 typecheck 会红 */
export interface Msg {
  validate: { text: MsgText; fn: MsgFn }
  command: { text: MsgText; fn: MsgFn }
  data: { text: MsgText; fn: MsgFn }
  ps: { text: MsgText; fn: MsgFn }
  selection: { text: MsgText; fn: MsgFn }
  confirm: { text: MsgText; fn: MsgFn }
  success: { text: MsgText; fn: MsgFn }
  /** 页面/组件层自拼的提示语（多处引用的才算；单引用页面私有文案留页面，见 §3.1） */
  page: { text: MsgText; fn: MsgFn }
}

/**
 * 待 P2 起逐条填充；本阶段为空骨架。
 * 写法：纯文案放 `text`，带参句放 `fn`，写错形状（函数塞 `text`、字符串塞 `fn`）typecheck 会红。
 * 禁止在此写死页面私有文案（按钮标签/标题/表头不算提示语）。
 */
export const msg: Msg = {
  validate: {
    text: {
      renameFixedGroup: '第一个分组是固定组，不能修改或删除',
      renameGroupMissing: '分组不存在',
      renameGroupNameRequired: '请输入组名',
      renameNewGroupNameRequired: '请输入新组名',
      renameItemTextRequired: '请输入预设文本',
      renameLayerOrExprRequired: '请输入图层名或表达式',
      renamePresetMissing: '预设不存在',
      renameHistoryMissing: '最近使用分组缺失',
    },
    fn: {
      freePanelOptionNotNumber: (key: string, preview: string) =>
        `自由面板项 ${key} 的 option 不是有效数字（原值 ${preview}），已拒绝执行`,
      freePanelTransformNotNumber: (field: string, preview: string) =>
        `自由面板项 zdy_customBuildTransform 的字段 ${field} 不是数字（原值 ${preview}），已拒绝执行`,
      freePanelTransformNotText: (field: string, preview: string) =>
        `自由面板项 zdy_customBuildTransform 的字段 ${field} 不是文本（原值 ${preview}），已拒绝执行`,
      quickFontMisaligned: (family: string, zz: string, mz: string, hjm: string) =>
        `字体「${family}」的字重/名称/PostScript 名数量不一致（${zz}/${mz}/${hjm}），已拒绝写入快选`,
      reorderIndexMissing: (what: string, value: string) => `${what} ${value} 不存在`,
      reorderGroupMissing: (group: string) => `分组 ${group} 不存在`,
    },
  },
  command: {
    text: {
      // action.ts
      actionGroupMissing: '分组不存在',
      actionGroupNameRequired: '分组名不能为空',
      actionMissing: '动作不存在',
      actionAliasRequired: '别名不能为空',
      actionWarehouseNameRequired: '仓库名不能为空',
      actionColCountInvalid: '列数只能是 1 / 2 / 3',
      actionCancelled: '取消操作',
      actionNoneSelected: '没有选中任何动作',
      actionTargetGroupMissing: '目标分组不存在',
      // commonUse.ts
      commonUseMultiplierInvalid: '倍数必须是正数',
      commonUsePickNotPath: '选图返回的不是路径',
      commonUseNoPsdInFolder: '文件夹内没有PSD文件',
      commonUseTransformIncomplete: '变换参数不完整',
      commonUseDistributeIncomplete: '分布参数不完整',
      // font.ts
      fontTagRequired: '标签名不能为空',
      fontImportReadFailed: '导入失败，文件读取失败',
      // fontSet.ts
      fontSetMissing: '字体缺失',
      fontSetHierarchyCountWrong: '添加的层级数量有误',
      fontSetEmptyInput: '不能输入空字符',
      fontSetPaddingRequired: '边距不能为空',
      fontSetButtonConfigIncomplete: '生成按钮的配置不完整：type 必须是数字、isLine 必须是布尔',
      fontSetButtonNoPadding: '生成按钮缺少配置：没有拿到 padding（按钮边距设置）',
      fontSetCopyAttrFailed: '复制文字属性失败',
      fontSetNoCopiedStyle: '请先复制字体样式',
      fontSetNoTranslatableText: '没有可翻译的文本',
      fontSetNetworkFailed: '连接服务器失败',
      fontSetFontSizeInvalid: '字号必须是大于 0 的数字',
      fontSetLeadingInvalid: '行距必须是不小于 0 的数字',
      fontSetTrackingInvalid: '字距必须是数字',
      fontSetNoPostScriptName: '这个字重没有 PostScript 名',
      fontSetNoQuickFont: '没有要应用的快捷字体',
      fontSetSwitchFailed: '切换失败',
      fontSetDeleteError: '删除异常',
      fontSetKeepOneMin: '最少保留一个',
      fontSetLayerNoFontInfo: '当前图层没有字体信息',
      fontSetFindFontInfoFailed: '查找字体信息失败!',
      fontSetHierarchyNameRequired: '请输入层级名字',
      fontSetNewNameRequired: '请输入新的名字',
      fontSetRenameIndexWrong: '重命名下标有误',
      fontSetDeleteIndexWrong: '删除下标有误',
      fontSetKeepOneRequired: '必须保留一个',
      fontSetPresetMissing: '当前预设不存在',
      // freePanel.ts
      freePanelNothingToAdd: '没有要添加的项',
      freePanelRegionMissing: '自由面板区域不存在',
      freePanelNameRequired: '名字不能为空',
      freePanelKeyRequired: 'key 不能为空',
      freePanelItemMissing: '自由面板项不存在',
      // rename.ts
      renameColorIndexInvalid: '颜色序号只能是 0-7',
      renameFixedGroupNoReorder: '第一个分组是固定组，不能拖动排序',
      // style.ts
      stylePickCancelled: '快速吸色到组已取消',
      stylePickTimeout: '快速吸色到组已超时：没有收到 Photoshop 事件',
      styleReadForegroundFailed: '读取前景色失败',
      styleNoGradientPayload: '这一项没有 gradient 载荷',
      styleReadGradientFailed: '读取渐变失败',
      styleReadGradientEmpty: '读取渐变失败：没有内容',
      stylePickOnlyColorLib: '快速吸色只能加到颜色库',
      styleReadFontAttrEmpty: '读取字体属性失败：没有可添加的字体',
      // swatch.ts
      swatchItemNoColor: '色板项缺少 color 字段，不能上色',
      swatchAppEventUnavailable: 'app event 通道不可用（不在 CEP 里）',
      swatchColorAlreadyIn: '色板里已经有这个颜色了，未重复添加',
      swatchNumberRequired: '请输入数字',
      swatchRecentCountInvalid: '最近使用记录不允许少于0或者多于15个颜色',
      swatchGroupNameRequired: '组名不能为空',
      // system.ts
      copyFileDirNotFound: '拷贝文件错误：找不到 PS 的脚本目录，请手动复制或者开启管理员权限',
    },
    fn: {
      // commonUse.ts
      commonUseBatchPartial: (
        action: string,
        done: string,
        total: string,
        failedCount: string,
        firstFile: string,
        firstReason: string,
      ) => `${action}成功 ${done}/${total}，失败 ${failedCount} 张（${firstFile}：${firstReason}）`,
      commonUseFlipDirectionUnsupported: (direction: string) => `翻转方向不支持：${direction}`,
      commonUseTooManyPsd: (count: string) =>
        `文件夹内超过30个psd，导出时间较长是否继续？（共 ${count} 张）`,
      commonUseUnknownSetting: (path: string) => `不认识的常用页设置项：${path}`,
      // font.ts
      fontNoPostScriptForVariant: (family: string, idx: string) =>
        `${family} 没有第 ${idx} 个字重的 PostScript 名`,
      fontTagExists: (text: string) => `已有同名标签：${text}`,
      fontTagMissing: (tag: string) => `标签不存在：${tag}`,
      fontTagReadFailed: (reason: string) => `标签读取失败：${reason}`,
      fontStarReadFailed: (reason: string) => `评分读取失败：${reason}`,
      quickFontBlocked: (fail: string) =>
        fail === 'limit' ? '最多添加15个字体哦' : '已存在同名字体',
      // fontSet.ts
      fontSetUnknownAlign: (axis: string) =>
        `未知的对齐方向：${axis}（合法值：h / v / bg-h / bg-v）`,
      fontSetSettingsCorrupt: (reason: string) => `字体设置文件损坏（${reason}），按间距分布已中止`,
      fontSetTranslateDailyLimit: (max: string) => `每天最多使用${max}次翻译功能`,
      /** `reason` 是百度返回的原话（没有就传空串）；生产者自己的话只在这里（判据 3） */
      fontSetTranslateFailed: (reason: string) => (reason ? `翻译失败（${reason}）` : '翻译失败'),
      fontSetTextTooLong: (max: string) => `文本长度不能超过${max}个字符`,
      // freePanel.ts
      freePanelFileCorrupt: (reason: string) => `自由面板文件损坏（${reason}），执行已中止`,
      freePanelKeyUnadapted: (key: string) => `自由面板 key 未适配：${key}`,
      // legacy.ts
      legacyKeyNotOpen: (key: string) => `旧自由面板 key 未开放：${key}`,
      // swatch.ts
      swatchSebanJsxMissing: (fn: string) =>
        `${fn} 不在本扩展的 jsx 里：它属于色板面板自带的 jsx/main.jsx（需随面板分发并 evalFile），详见 docs/页面/11-色板面板.md §六`,
      // system.ts
      copyFileError: (error: string) => `拷贝文件错误：${error}。请手动复制或者开启管理员权限`,
      optimizingDoc: (cur: string, total: string) => `正在优化文档：${cur}/${total}`,
      exporting: (cur: string, total: string) => `正在导出：${cur}/${total}`,
      readSelectionFailed: (reason: string) => `读取选区失败：${reason}`,
      addedToFreePanel: (text: string) => `已加入自由面板「${text}」`,
      addedNActions: (n: string) => `已加入 ${n} 个动作`,
      prefSaveFailed: (message: string) => `偏好保存失败：${message}`,
    },
  },
  data: {
    text: {
      // action-archive.ts
      importNoWarehouse: '导入文件没有仓库',
      noExportableWarehouse: '没有可导出的仓库',
      readImportFileFailed: '读取导入文件失败',
      // common-use.ts / font-list.ts
      sysFontEmpty: 'ztgl_initSystemList 返回 ok，但 SysFont2.json 里没有字体',
      // style-library-io.ts
      noExportableLibFile: '没有可导出的库文件（索引里的文件都读不到）',
      // style-library-repo.ts
      warehouseIndexNoCurrent: '仓库索引里没有当前仓库',
      warehouseNameRequired: '仓库名不能为空',
      nodeUnavailableRecycle: 'Node 不可用，无法把仓库文件移到回收目录',
      keepOneGroupMin: '最少保留一个分组哦',
      groupNameRequired: '分组名不能为空',
      groupMustBeObject: '组必须是非空对象',
      itemMustBeObject: '项必须是非空对象',
      nameRequired: '名称不能为空',
      changeColorNotObject: 'cy_changeStyleColor 返回值不是对象，未回写',
      // swatch-repo.ts
      swatchNotColorItem: '不是颜色项（缺少 color.hex），未添加',
    },
    fn: {
      // action-archive.ts
      warehouseFileNameInvalid: (fileName: string) => `仓库文件名不合法：${fileName}`,
      importFileNameInvalid: (name: string) => `导入文件名不合法：${name}`,
      importFileNameDup: (name: string) => `导入文件名重复：${name}`,
      indexRefMissingFile: (fileName: string) => `索引引用了不存在的文件：${fileName}`,
      indexDupRefFile: (fileName: string) => `索引重复引用文件：${fileName}`,
      actionIndexCorruptAbort: (reason: string, action: string) =>
        `动作库索引文件损坏（${reason}），${action}已中止：磁盘上的仓库文件没动`,
      readWarehouseFailed: (fileName: string) => `读取仓库失败：${fileName}`,
      // 写/删的失败文案统一由 `disk-write` 的 `fileWriteFailed` / `fileRemoveFailed` 出
      // （它们带完整路径与原因）。owner 层不再各写一句 —— 那是同一件事的第二份文案。
      // actions.ts
      actionIndexCorruptDeleteAbort: (reason: string) =>
        `动作库索引文件损坏（${reason}），删除已中止`,
      // common-use.ts
      commonUseReadFailedRefuseWrite: (file: string) => `${file} 读取失败，拒绝写入`,
      commonUseNotJsonRefuse: (file: string) => `${file} 内容不是合法 JSON，拒绝覆盖`,
      commonUseRootNotArrayRefuse: (file: string) => `${file} 根不是数组，拒绝覆盖`,
      commonUseRootNotArrayRewrite: (file: string) => `${file} 根不是数组，无法改写`,
      commonUseItemMissing: (id: string) => `常用项不存在：${id}`,
      // file-repo.ts
      fileCompareReadFailed: (target: string) => `落盘前比对读不到原文，已中止写入：${target}`,
      fileWriteFailed: (target: string, reason: string) => `写入失败：${target}（${reason}）`,
      // disk-write.ts：removeFile 失败（`ENOENT` 不算失败，已被它自己放过）
      fileRemoveFailed: (target: string, reason: string) => `删除失败：${target}（${reason}）`,
      // action-archive：导入成功但旧文件删不掉（孤儿）。用户必须知道，否则磁盘上慢慢堆积且界面上看不见
      orphanFilesLeft: (count: string, sample: string) =>
        `导入已完成，但有 ${count} 个旧文件没删掉（例如 ${sample}）——它们还留在动作库目录里，可手动删除`,
      fileReadFailedAbortWrite: (target: string, reason: string) =>
        `${target} 读不到，已中止写入（${reason}）`,
      fileReadReasonRefuseOverwrite: (target: string, reason: string) =>
        `${target} ${reason}，拒绝覆盖写`,
      fileNotExistsRefuseWrite: (target: string) => `${target} 不存在，拒绝写入`,
      fileLockedByOtherPanel: (target: string, retries: string) =>
        `${target} 正被其他面板修改，写入已放弃（重试 ${retries} 次）`,
      // exclusive.ts：长事务互斥（同一批文件不许两个事务同时改）
      exclusiveBusy: (what: string) => `${what}还没完成，请等它结束再试`,
      // utils/decode.ts：`DecodeFail` 的**唯一渲染处**（形状臂 + 语义臂）
      // decode 层只报观测/码，用户话只在这里出现
      decodeShapeFail: (field: string, expected: string, actual: string) =>
        `${field ? `字段 ${field}` : '顶层'} 期望 ${expected}，实际是 ${actual}`,
      decodeNotJson: () => '内容不是合法 JSON',
      decodeEmptyContent: () => '内容是空的',
      decodeNoItemsParsed: (count: string) => `有 ${count} 个条目，但一个都没解析出来`,
      decodeBadItem: (count: string) => `有 ${count} 个条目形状不对`,
      // font-list.ts
      // classification-repo.ts：两种原因**不许合并成一句**（T-107：读不到 ≠ 读不懂）
      classificationReadFailed: () => '分类数据读取失败',
      classificationBadShape: () => '分类数据格式不正确',
      sysFontReadFailed: (reason: string) => `读不到系统字体：${reason}（SysFont2.json）`,
      sysFontUnrecognized: (data: string) => `ztgl_initSystemList 返回了无法识别的数据：${data}`,
      // legacy-settings.ts
      unknownSettingKeys: (keys: string) => `不认识的常用页设置键：${keys}`,
      // protected-text.ts
      // 备份/写入失败统一由 `disk-write` 的 `fileWriteFailed` 出（含完整路径与原因）；
      // owner 层不再各写一句 —— 两处都写就是同一句话套两遍。
      protectedReadBackMismatch: (path: string) => `${path} 写入后回读不一致，已按失败处理`,
      // settings.ts
      prefReadFailedSkipSave: (reason: string) =>
        `偏好文件读不到，本次不保存偏好（避免默认值覆盖原文件）：${reason}`,
      prefWriteFailed: (reason: string) => `偏好写入失败：${reason}`,
      // style-library-io.ts
      // 写盘失败（含备份 / 隔离副本 / 库文件本体）统一由 `disk-write` 的 `fileWriteFailed` 出：
      // 它的文案已含完整路径（`.bak` / `.corrupt-*` 都在路径里）与原因。
      // 在这里再包一层会变成「备份失败：x.bak（写入失败：x.bak（EACCES））」—— 同一句话套两遍。
      indexReadFailedAbortReplace: (reason: string) =>
        `索引读不到，已中止替换（没有 .bak 的替换等于没有退路）：${reason}`,
      // style-library-repo.ts
      warehouseIndexCorruptAbort: (reason: string) =>
        `仓库索引文件损坏（${reason}），已中止：不猜库文件路径`,
      warehouseIndexEmpty: () => '仓库索引里没有任何仓库',
      indexNoKindFileName: (kind: string) => `索引里没有当前仓库的${kind}库文件名`,
      libFileNameInvalid: (fileName: string) => `库文件名不合法：${fileName}`,
      libFileNotJson: (kind: string) => `${kind} 库文件不是合法 JSON`,
      libFileRootNotArray: (kind: string) => `${kind} 库文件顶层不是数组`,
      libFileBadItem: (kind: string, count: string) =>
        `${kind} 库文件里有 ${count} 项不是对象（顶层是数组，但组不是）`,
      groupNoId: (groupIndex: string) => `分组 ${groupIndex} 没有 id`,
      groupMissing: (groupIndex: string) => `分组 ${groupIndex} 不存在`,
      groupNoList: (groupIndex: string) => `分组 ${groupIndex} 没有 list`,
      itemMissing: (itemIndex: string) => `第 ${itemIndex} 项不存在`,
      actionWarehouseMissing: () => '仓库不存在',
      actionWarehouseLastOne: () => '至少保留一个仓库',
      itemAlreadyFirst: () => '已经是第一项',
      itemAlreadyLast: () => '已经是最后一项',

      libFileReadFailedAbortWrite: (kind: string, fileName: string, reason: string) =>
        `${kind} 库文件读不到，已中止写入：${fileName}（${reason}）`,
      warehouseMissing: (index: string) => `仓库 ${index} 不存在`,
      // 复制到回收目录失败由 `disk-write` 的 `fileWriteFailed` 出（含目标路径与原因）
      // swatch-repo.ts
      swatchReadFailed: (path: string, reason: string) => `色板文件读不到：${path}（${reason}）`,
      swatchNotJson: (path: string) => `色板文件不是合法 JSON：${path}`,
      swatchRootNotArray: (path: string) => `色板文件顶层不是数组：${path}`,
      starsReadFailed: (reason: string) => `读取不到星级文件（${reason}）`,
      customColorSkipped: (n: string) =>
        `自定义色有 ${n} 条认不出，已跳过（色板文件里有无法识别的颜色项）`,
      customColorReadFailed: (reason: string) =>
        `自定义色读取失败（${reason}），这一组颜色暂时显示不出来`,
      recentColorSkipped: (n: string) =>
        `最近色有 ${n} 条认不出，已跳过（色板文件里有无法识别的颜色项）`,
      recentColorReadFailed: (reason: string) =>
        `最近色读取失败（${reason}），这一组颜色暂时显示不出来`,
      actionIndexCorruptDefault: (reason: string, indexFile: string) =>
        `动作库索引文件损坏（${reason}），当前显示的是默认仓库 ${indexFile}`,
      actionLibraryCorrupt: (reason: string) => `动作库文件损坏（${reason}）`,
      panelSettingsReadFailed: (reason: string) => `面板设置读取失败（${reason}），已按默认值显示`,
      quickFontReadFailed: (reason: string) => `快捷字体读取失败（${reason}），已按默认值显示`,
      hierarchyReadFailed: (reason: string) => `层级预设读取失败（${reason}），已按默认值显示`,
      translateCounterReadFailed: (reason: string) =>
        `翻译计数读取失败（${reason}），已按默认值显示`,
      warehousesReadProgress: (done: string, total: string) => `已读取 ${done}/${total} 个仓库`,
      filesWrittenProgress: (done: string, total: string) => `已写入 ${done}/${total} 个文件`,
      readFailed: (reason: string) => `读取失败：${reason}`,
      defaultGroupLabel: (label: string) => `${label}默认分组`,
    },
  },
  ps: {
    text: {
      // dialog.ts
      cepDialogUnavailable: 'CEP 文件对话框不可用',
      // fs.ts
      nodeUnavailable: 'Node 不可用，检查 manifest 里的 --enable-nodejs',
      /** cep/fs-read.ts：异步读既没有 Node 也没有 CEP（两条路都没有，不是"读不到文件"） */
      /** cep/events.ts：宿主没给可用的回调频道（挂不上监听，事件永远收不到） */
      psEventListenerUnavailable: 'CEP 回调监听不可用',
      // http.ts
      networkUnsupported: '当前环境不支持网络请求',
      connectServerTimeout: '连接服务器超时',
      connectServerFailed: '连接服务器失败',
      // open-url.ts
      cepOpenUrlUnavailable: 'CEP 外链接口不可用（window.cep.util.openURLInDefaultBrowser）',
      // ps.ts
      extDirUnavailable: '拿不到扩展目录（getSystemPath("extension") 失败）',
      // transport.ts
      notInCep: '当前不在 CEP 环境里，无法调用 ExtendScript',
      evalScriptFailed: 'EvalScript 执行失败（脚本抛错，或 jsx 尚未加载）',
    },
    fn: {
      // paths.ts
      psEventRegisterFailed: (name: string, typeId: string) =>
        `注册 PS 事件失败：${name}（${typeId}）`,
      userDataUnavailable: (reason: string) =>
        `拿不到用户数据目录（getSystemPath("userData") 失败：${reason}）`,
      // http.ts
      requestTimeout: (seconds: string) => `请求超时（${seconds}s）`,
      // ps.ts
      loadJsxFailed: (reason: string) => `加载 jsx 失败：${reason}`,
      initSystemListUnavailable: (typeRes: string, diag: string) =>
        `jsx 已加载，但 ztgl_initSystemList 不可用（typeof = ${typeRes}；${diag}）`,
      isSelectLayerUnrecognized: (preview: string) =>
        `Layer_isSelectLayer 返回了无法识别的值（${preview}）：无法判断有没有选中图层`,
      getTypeNumberUnrecognized: (preview: string) =>
        `Layer_getTypeNumber 返回了无法识别的值（${preview}）：无法判断图层类型`,
      // transport.ts
      timeoutUnknown: (timeout: string, script: string) =>
        `Photoshop 在 ${timeout}ms 内没有回包（脚本可能仍在执行，也可能已经执行完）：${script}`,
      argUndefined: (where: string, i: string) =>
        `${where}：第 ${i} 个参数是 undefined（jsx 侧收到的是字符串，漏传会静默变 null）`,
      jsxThrow: (label: string, raw: string) => `${label}：${raw}`,
      resultNotJson: (label: string, raw: string) =>
        `${label}：返回值不是 JSON（也不是成功哨兵 ok）：${raw}`,
    },
  },
  selection: {
    text: {
      // selection/current-text.ts（用户可见：经 stores/font-set 的 textError / textInfoStale 进 UI）
      textInfoReadFailed: '读取文字属性失败',
    },
    fn: {
      textInfoStale: (what: string, seconds: string) =>
        `刚才${what}，但 ${seconds}s 内没读到新的文字属性：面板上现在显示的可能不是当前选区/当前图层的值`,
      hostEventFired: (name: string) => `在 Photoshop 里触发了「${name}」事件`,
    },
  },
  confirm: {
    text: {
      // CepModal / ConfirmHost 默认值（弹窗通用）
      modalTitle: '提示',
      modalOk: '确定',
      modalCancel: '取消',
      // 破坏性操作确认标题
      deleteConfirmTitle: '确认删除',
      confirmTitle: '确认',
    },
    fn: {
      // style/index.vue 破坏性操作确认问句
      deleteItem: (name: string) => `删除「${name}」？删除后无法恢复。`,
      deleteGroup: (name: string, count: string) =>
        `删除分组「${name}」？组内 ${count} 项会一起删除。`,
      deleteWarehouse: (name: string) =>
        `删除仓库「${name}」？四个库文件与组图片会移到用户目录下的 .deleted-<时间戳> 文件夹，可手动恢复。`,
      // action/index.vue 确认问句（措辞与 style 页不同：动作只从列表移除，不影响 PS）
      actionDeleteWarehouse: (name: string) => `删除仓库「${name}」？仓库文件也会删除。`,
      actionDeleteGroup: (name: string) =>
        `删除分组「${name}」？组内动作只从列表移除，不影响 Photoshop。`,
      actionDeleteItem: (name: string) => `删除动作「${name}」？`,
      actionImportReplace: () => '导入替换会覆盖当前仓库索引，确定继续？',
      // rename/index.vue 确认问句
      renameDeleteGroup: (name: string) => `删除分组「${name}」？组内预设会一起删除。`,
      renameDeleteItem: (name: string) => `删除预设「${name}」？`,
      // fontManage/index.vue 标签确认问句
      deleteTagConfirm: (tag: string) => `确定删除标签「${tag}」吗？`,
      deleteTagHasFonts: (count: string) => `该标签下有 ${count} 个字体，删除后关联会一起消失。`,
      importTagsConfirm: () => '导入标签，会覆盖原来的标签及评分，是否继续？',
      exportTagsConfirm: () => '导出标签，不包含字体文件，仅导出标签及评分，是否继续？',
    },
  },
  success: {
    text: {
      importedDefaultPresets: '已导入默认动作预设',
      exportOk: '导出成功',
      importOk: '导入成功',
      buttonGenerated: '生成按钮完成',
      copyOk: '复制成功',
      switchOk: '切换成功',
      fontAdded: '添加字体成功',
      workspaceDeleted: '已删除工作区',
      regionAdded: '已新增区域',
      regionDeleted: '已删除区域',
      configCopied: '已拷贝配置文件',
      refreshOk: '刷新成功',
      foregroundAdded: '已添加前景色',
      gradientAdded: '已添加当前渐变',
      fontAttrAdded: '已添加当前字体',
      layerStyleSaved: '已保存图层样式',
      warehouseDeleted: '已删除仓库',
      presetUpdated: '更新成功',
      presetCreated: '添加成功',
      presetRenamed: '重命名成功',
      itemDeleted: '删除成功',
      tagsImported: '已导入标签',
      tagsExported: '已导出标签',
      pulledFromCloud: '已从云端拉取',
      // style/index.vue 命令成功回报（页面传给 useCommand.invoke 第二参）
      colorAddedToGroup: '已添加到分组',
      groupRenamed: '已重命名分组',
      itemRenamed: '已重命名',
      itemDeletedGeneric: '已删除',
      groupDeletedGeneric: '已删除分组',
      sentToSwatch: '已发送到色板',
      appendedToSwatch: '已追加到色板',
      warehouseRenamed: '已重命名仓库',
      groupCreated: '已新建分组',
      // action/index.vue
      aliasDeleted: '已删除别名',
      actionDeleted: '已删除动作',
    },
    fn: {
      commandExecuted: (title: string) => `已执行：${title}`,
      groupDeleted: (name: string) => `已删除分组「${name}」`,
      tagCreated: (name: string) => `已新建标签「${name}」`,
      tagDeleted: (tag: string) => `已删除标签「${tag}」`,
      itemExecuted: (text: string) => `已执行「${text}」`,
      itemRemoved: (text: string) => `已移除「${text}」`,
    },
  },
  page: {
    text: {
      noActionsInGroup: '*该分组没有动作',
    },
    fn: {},
  },
}
