# 模板 · font-manage-list-font-weight

> 来源：`app.v4.js` render 函数 `bx`（行 47388）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__font-weight">
  <div class="font-manage__font-weight__preview-wrap">
    <div class="font-manage__font-weight__preview" />
    <div class="font-manage__font-weight__preview--count" @click>
    </div>
  </div>
  <div class="font-manage__font-weight__dropdown" />
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 2 | `v-for` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "font-manage__font-weight"
      }, [n("div", {
        staticClass: "font-manage__font-weight__preview-wrap"
      }, [t._t("default", function () {
        return [n("div", {
          staticClass: "font-manage__font-weight__preview"
        }, t._l(t.fontFamilies, function (e, a) {
          return n("pre", {
            key: a,
            class: {
              "font-manage__font-weight__pre--active": a === t.current
            },
            style: {
              fontFamily: e
            },
            on: {
              click: function (e) {
                e.stopPropagation();
                return t.selectFontWeight(a);
              }
            }
          }, [t._v(t._s(t.previewText))]);
        }), 0)];
      }), t.fontFamilies.length ? n("div", {
        staticClass: "font-manage__font-weight__preview--count",
        on: {
          click: function (e) {
            e.stopPropagation();
            return t.toggle.apply(null, arguments);
          }
        }
      }, [t._v(" " + t._s(t.postScriptNames.length) + " ")]) : t._e()], 2), t.open ? n("div", {
        staticClass: "font-manage__font-weight__dropdown"
      }, t._l(t.weights, function (e, a) {
        return n("div", {
          key: a,
          on: {
            click: function (e) {
              e.stopPropagation();
              return t.selectFontWeight(a);
            }
          }
        }, [t.current === a ? n("Icon", {
          attrs: {
            type: "check_outline"
          }
        }) : t._e(), n("span", [t._v(t._s(e))])], 1);
      }), 0) : t._e()]);
    }
```