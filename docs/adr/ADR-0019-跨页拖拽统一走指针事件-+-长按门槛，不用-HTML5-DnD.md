# ADR-0019 · 跨页拖拽统一走指针事件 + 长按门槛，不用 HTML5 DnD

- **状态**：生效
- **结论**：跨页拖拽统一走指针事件 + 300ms 长按门槛，废弃 HTML5 DnD；收口在 useLongPressDrag + domain/reorder。
- **日期**：2026-10-22（取自源文档状态索引「定于」列，未逐条 git log -S 复核）
- **裁定人**：UNVERIFIED（源文档未记每条裁定人）
- **触发**：动作页用 HTML5 DnD 是未经权衡直接实现，错误被复制两次

## 背景

源文档（`docs/架构/决策记录.md`）本条未单列「背景」段：旧约定与原因写在「决定 / 原因 / 由来」字段里，已随「判据」段逐字搬来。

## 判据（它凭什么成立 / 为什么不成立）

- **决定**：
  - 全项目拖拽统一走指针/鼠标事件（`mousedown` / `mousemove` / `mouseup`）+ 300ms 长按门槛；实现收口在 `src/composables/useLongPressDrag.ts`，落点计算收口在 `src/domain/reorder.ts`（`DropPosition = 'before' | 'after'`）。
  - HTML5 DnD 全部废弃：`components/ActionGrid.vue` 不再提供 `draggable` 与 `dragstart` / `dragover` / `drop`；动作页 / 重命名页 / 自由面板的迁移见台账 T-67（**T-67 已 done：三页全部迁完，`git grep -n 'draggable' -- src/pages` 零命中**）。
  - 两套机制不许混用（`useLongPressDrag.ts:4` 已写死这条）。
- **2026-10-23 修正**：原写「当前三页仍是 DnD，属于待迁移状态，不是已完成」。T-67 已 done：`src/pages/action/index.vue:77` 与 `src/pages/freePanel/components/FreePanel.vue:172` 都留着"旧的 HTML5 DnD 已删，T-67"的注释，`src/pages` 下 `draggable` 零命中，`useLongPressDrag.ts:2` 自述"T-67 起三页已迁完"。**判据（拖拽统一走指针事件 + 不许混用）未变。**
- **原因**：
  - 动作页最初用 HTML5 DnD 是**没有经过方案权衡就直接实现的**；重命名页按「复用第一页已有实现」照抄，错误被复制了两次；直到样式页才按原版 `am()`（`app.v4.js:37402-37532`，全文件 15 处调用）复刻出正确机制。
  - **原版实现只是输入之一，不是结论**：选指针事件的真正理由是下表对比，不是"原版这么做"。

  | 维度 | HTML5 DnD | 指针事件 |
  |---|---|---|
  | 拖动中视觉可控性 | 拖影是浏览器截的静态图，改不了 | 可克隆 `opacity:0` 占位 + 浮层跟手 |
  | 长按门槛 | `dragstart` 立刻触发，做不出 300ms | 自己控时机（`mousedown` 起计时） |
  | 精确落点（插前 / 插后） | `drop` 只给目标元素，插前/插后要靠 class 猜 | 自己算布尔（`domain/reorder.ts` 的 `DropPosition`） |
  | 自动滚动容器 | 浏览器代劳 | 要自己写 |
  | 代码量与边界处理 | 少 | 多，要管指针捕获、清理、边界 |
  | CEP 内可用性 | `dataTransfer` 在 CEP 里未验 | 纯 DOM 事件，最稳 |

- **代价**：
  - 指针事件要自己处理滚动容器自动滚动与边界：`useLongPressDrag` 目前只把 `scrollRoot.scrollTop` 计入落点坐标，没有自动滚动，T-67 迁移时补。
  - `useLongPressDrag` 与 HTML5 DnD 绝不能混用（该文件 `:4` 的注释已写这条）；迁移期两套并存，必须按页切换，不能在同一页混用。
- **什么时候推翻**：出现触摸 / 手写笔等需要原生手势语义的场景，或 CEP 升级到支持 `PointerEvent.setPointerCapture` 更完整时再复核。
- **落地**：台账 T-67。

## 决议

决议即「判据」段各条判据本身；本条无独立例外或指向性补充。

## 后果


- 📌 **违反时的判据**：`git grep -n "draggable|dragstart|onDrop" src/pages` 有命中；或同一页同时出现 `useLongPressDrag` 与 HTML5 DnD。
源文档本条未单列「后果」段；推翻条件已逐字保留在「判据」段的「什么时候推翻」字段。
