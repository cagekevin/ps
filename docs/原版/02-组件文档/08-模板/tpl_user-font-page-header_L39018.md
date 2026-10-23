# 模板 · user-font-page-header

> 来源：`56d7.js` render 函数 `Uw`（行 39018）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<Empty />
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
  if (t.total === 0) {
    return n("Empty");
  } else {
    return n("FontList", {
      attrs: {
        fonts: t.fonts,
        groups: t.groups,
        ratings: t.ratings,
        "preview-text": t.previewText,
        "preview-mode": t.previewMode,
        commercials: t.commercials,
        languages: t.languages
      },
      on: {
        "tag-to-font": t.tagToFont,
        "rating-to-font": t.ratingToFont,
        "select-font": t.selectFont,
        "load-more": t.loadMore
      }
    });
  }
}
```