# 模板 · version-switcher

> 来源：`app.v4.js` render 函数 `gT`（行 62459）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div>
  <div class="version-switcher">
    <gd-switch @change />
    <gd-button @click type="text" />
  </div>
  <cep-modal @cancel>
    <div class="version-switcher__content" />
  </cep-modal>
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
      if (t.showVersionSwitcher) {
        return n("div", [n("div", {
          staticClass: "version-switcher"
        }, [n("gd-switch", {
          attrs: {
            checked: t.checked
          },
          on: {
            change: t.switchVersion
          }
        }), n("gd-button", {
          attrs: {
            type: "text"
          },
          on: {
            click: t.changeVersion
          }
        }, [t._v(t._s(t.displayVersionType))])], 1), t.open ? n("cep-modal", {
          attrs: {
            title: t.title,
            "confirm-loading": t.waiting,
            "has-offset": t.hasOffset
          },
          on: {
            cancel: t.cancel,
            ok: t.confirm
          }
        }, [n("div", {
          staticClass: "version-switcher__content"
        }, [t._v(t._s(t.tip))])]) : t._e()], 1);
      } else {
        return t._e();
      }
    }
```