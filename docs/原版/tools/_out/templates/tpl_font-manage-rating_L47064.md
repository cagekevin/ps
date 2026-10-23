# 模板 · font-manage-rating

> 来源：`app.v4.js` render 函数 `Qw`（行 47064）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__list">
  <ListItem class="font-manage__list-item__name" :style="{ fontFamily: t.getPreviewFontFamily(e, t.postScriptNames) } }, [t._v(" " + t._s" />
  <div />
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
      return n("div", {
        ref: "font-list",
        staticClass: "font-manage__list",
        class: t.classes
      }, [t._l(t.fonts, function (e) {
        return n("ListItem", {
          key: e.family,
          attrs: {
            font: e,
            selectedFont: t.selectedFont,
            ratings: t.ratings,
            commercials: t.commercials
          },
          on: {
            "select-font": t.selectFont,
            "tag-to-font": t.makeTag,
            "rating-to-font": t.rating
          },
          scopedSlots: t._u([t.noPreview ? null : {
            key: "font-family",
            fn: function () {
              return [n("span", {
                staticClass: "font-manage__list-item__name"
              }, [t._v(t._s(e.family))])];
            },
            proxy: true
          }, t.noPreview ? null : {
            key: "preview",
            fn: function () {
              return [n("Preview", {
                attrs: {
                  "preview-text": t.previewText,
                  "preview-mode": t.previewMode,
                  "font-family": t.getPreviewFontFamily(e, t.postScriptNames),
                  "display-name": e.family,
                  language: t.languages[e.family] || t.familyLang(e.family)
                }
              })];
            },
            proxy: true
          }, {
            key: "weight",
            fn: function () {
              return [n("FontWeight", {
                attrs: {
                  family: e.family,
                  weights: e.weights,
                  "post-script-names": e.postScriptNames,
                  language: t.languages[e.family] || t.familyLang(e.family)
                },
                on: {
                  "select-font-weight": function (n) {
                    return t.selectFontWeight(n, e);
                  }
                }
              }, [t.noPreview ? [n("span", {
                staticClass: "font-manage__list-item__name--no-preview",
                style: {
                  fontFamily: t.getPreviewFontFamily(e, t.postScriptNames)
                }
              }, [t._v(" " + t._s(e.family) + " ")])] : t._e()], 2)];
            },
            proxy: true
          }], null, true)
        });
      }), n("div", {
        ref: "page-loader"
      })], 2);
    }
```