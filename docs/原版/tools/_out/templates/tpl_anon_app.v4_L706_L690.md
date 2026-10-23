# 模板 · anon_app.v4_L706

> 来源：`app.v4.js` render 函数 `O`（行 690）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="tip f-center">
  <div class="  tipMain" />
</div>
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
      if (t.isShowMessageBox) {
        return n("div", {
          staticClass: "tip f-center"
        }, [n("div", {
          staticClass: "  tipMain"
        }, [t._v(t._s(t.text))])]);
      } else {
        return t._e();
      }
    }
```