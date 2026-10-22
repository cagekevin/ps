# 2026-10-20 · 列表 composable 合并

> 三个 composable（useListPage + usePagedView + useInfiniteScroll）合成一个 usePagedList

## 背景

字体管理页接入横切时发现：写一个列表页要拼三个 composable、四个 ref、一个哨兵元素。

```ts
const { items, loading, error, load } = useListPage(fetcher)
const { visible, hasMore, loadMore } = usePagedView(filtered, 60)
useInfiniteScroll(sentinel, () => loadMore(), { root: listRef })
```

少接一个就出错，而且顺序没人记得。这是**抽象粒度错了**——按职责拆（加载/分页/滚动），但按使用场景它们是一个整体。

## 做了什么

- 新增 `usePagedList`，把三者合一
- 删除 `useListPage.ts`、`usePagedView.ts`（不留死代码）
- `useInfiniteScroll` 保留，但只作为 `usePagedList` 的内部依赖
- 页面从 5 行调用缩成 1 行 + 1 行 `bind(filtered)`

## 为什么

判断标准是"使用时要记几个东西"。原来要记三个函数名 + 调用顺序 + 哨兵放哪；现在只记一个函数。

顺带修了一个类型问题：模板里 `ref="listRef"` 在 `<script setup>` 下 vue-tsc 认不出"被使用"，会把变量报成 unused。
解法是**让页面声明 ref 并作为参数传进去**——既解决类型，也让 DOM 归属更清楚。

## 影响 / 后续

- `hasMore` / `loadMore` 不再从页面暴露（滚动加载全内部处理）
- 服务端分页去掉了：现在所有列表页都是本地数据（PS / 文件），不需要 page 参数；真需要时再加
- 文档 `docs/生成/横切能力.md` 的列表页示例已同步
