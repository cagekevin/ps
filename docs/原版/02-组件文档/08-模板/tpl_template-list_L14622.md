# 模板 · template-list

> 来源：`56d7.js` render 函数 `Fo`（行 14622）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<GTooltip @click>
  <template>
  </template>
</GTooltip>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `if` 条件分支 | 1 | `v-if` / `v-else` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  if (t.downloadCountText) {
    return n("GTooltip", {
      attrs: {
        placement: "bottomRight",
        overlayClassName: "download_count_tips"
      },
      on: {
        click: t.showTryLimitDialog
      }
    }, [n("template", {
      slot: "title"
    }, [t._v(" " + t._s(t.downloadCountTips) + " ")]), t._v(" " + t._s(t.downloadCountText) + " ")], 2);
  } else {
    return t._e();
  }
}
```