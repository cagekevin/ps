# 模板 · font-manage-preview-text

> 来源：`app.v4.js` render 函数 `Zx`（行 47925）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div>
  <div class="font-manage__preview-setting__actions">
    <Icon type="eye_outline" />
    <Icon type="ai" />
  </div>
  <div class="font-manage__preview-setting__card" />
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 1 | `v-for` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", [n("div", {
        staticClass: "font-manage__preview-setting__actions"
      }, [n("Icon", {
        attrs: {
          type: "eye_outline"
        },
        nativeOn: {
          click: function (e) {
            e.stopPropagation();
            return t.togglePreviewSetting.apply(null, arguments);
          }
        }
      }), n("Icon", {
        attrs: {
          type: "ai"
        },
        nativeOn: {
          click: function (e) {
            e.stopPropagation();
            return t.togglePreviewText.apply(null, arguments);
          }
        }
      })], 1), t.showPreviewSetting ? n("div", {
        ref: "preview-setting",
        staticClass: "font-manage__preview-setting__card"
      }, t._l(t.previewModes, function (e) {
        return n("div", {
          key: e.mode,
          class: {
            "font-manage__preview-setting__el--active": t.previewMode === e.mode
          },
          on: {
            click: function (n) {
              return t.selectPreviewMode(e);
            }
          }
        }, [n("Icon", {
          attrs: {
            type: "check_outline"
          }
        }), n("span", [t._v(t._s(e.name))])], 1);
      }), 0) : t._e()]);
    }
```