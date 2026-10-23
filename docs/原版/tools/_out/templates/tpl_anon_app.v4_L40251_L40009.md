# 模板 · anon_app.v4_L40251

> 来源：`app.v4.js` render 函数 `sv`（行 40009）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="w100">
  <div class="mt10 selectFont">
    <baseOpen @change v-model="fontSizeIstrue" />
    <dropDowncom class="selectFont-dropDown zindex99" @dropchange />
  </div>
  <div class="f-alignNone app-padding mt4" />
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 1 | `v-for` |
| `if` 条件分支 | 1 | `v-if` / `v-else` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      if (t.set.ztShowQuick) {
        return n("div", {
          staticClass: "w100"
        }, [n("div", {
          staticClass: "mt10 selectFont"
        }, [n("baseOpen", {
          attrs: {
            svgClass: "oldguide-four-custom",
            align: "rightCenter",
            text: t.data.info.list[t.data.info.index].family,
            title: "快速设置字体，可自由添加"
          },
          on: {
            change: function (e) {
              return t.openMenu();
            }
          },
          model: {
            value: t.fontSizeIstrue,
            callback: function (e) {
              t.fontSizeIstrue = e;
            },
            expression: "fontSizeIstrue"
          }
        }), n("dropDowncom", {
          ref: "fontSize",
          staticClass: "selectFont-dropDown zindex99",
          attrs: {
            text: t.selectFont,
            selectIndex: t.data.info.index,
            bottom: "添加当前图层字体",
            firstSvg: "#icongouxuan",
            therrSvg: "#iconshanchu"
          },
          on: {
            dropchange: function (e) {
              return t.changeSelect(e);
            },
            clickBottom: function (e) {
              return t.addCurrentLayer();
            },
            therrHandle: function (e) {
              return t.deleteFont(e);
            }
          }
        })], 1), n("div", {
          staticClass: "f-alignNone app-padding mt4"
        }, t._l(t.weightLen, function (e, a) {
          return n("baseIcon", {
            key: a,
            attrs: {
              select: t.index == a,
              name: "#iconzihaodaxiao" + (a + 1),
              svgWidth: "20px",
              title: e
            },
            on: {
              handle: function (e) {
                return t.setFont(a);
              }
            }
          });
        }), 1)]);
      } else {
        return t._e();
      }
    }
```