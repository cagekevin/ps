# 模板 · anon_app.v4_L582

> 来源：`app.v4.js` render 函数 `m`（行 488）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="input-box" @click>
  <div class="input-box-main" @click>
    <div class="input-box-header">
      <span />
      <Icon class="clear-icon" type="clear_outline" />
    </div>
    <GInput class="mt15" v-model="value" />
    <p class="input-box-err" />
    <div class="mt15 input-box-footer">
      <GButton class="cancel-button" @click>
        取消
      </GButton>
      <GButton class="confirm-button" @click type="primary">
        确定
      </GButton>
    </div>
  </div>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `if` 条件分支 | 2 | `v-if` / `v-else` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      if (t.isShow) {
        return n("div", {
          staticClass: "input-box",
          on: {
            click: function (e) {
              e.stopPropagation();
              return t.cancel();
            },
            contextmenu: function (e) {
              return t.cancel();
            }
          }
        }, [n("div", {
          staticClass: "input-box-main",
          on: {
            click: function (t) {
              t.stopPropagation();
            }
          }
        }, [n("div", {
          staticClass: "input-box-header"
        }, [n("span", [t._v(t._s(t.title))]), n("Icon", {
          staticClass: "clear-icon",
          attrs: {
            type: "clear_outline"
          },
          nativeOn: {
            click: function (e) {
              return t.close.apply(null, arguments);
            }
          }
        })], 1), n("GInput", {
          ref: "inputbox",
          staticClass: "mt15",
          nativeOn: {
            input: function (e) {
              t.err = "";
            },
            keyup: function (e) {
              if (!e.type.indexOf("key") && t._k(e.keyCode, "enter", 13, e.key, "Enter")) {
                return null;
              } else {
                return t.ok();
              }
            },
            focus: function (e) {
              return t.select.apply(null, arguments);
            }
          },
          model: {
            value: t.value,
            callback: function (e) {
              t.value = e;
            },
            expression: "value"
          }
        }), t.err != "" ? n("p", {
          staticClass: "input-box-err"
        }, [t._v(t._s(t.err))]) : t._e(), n("div", {
          staticClass: "mt15 input-box-footer"
        }, [n("GButton", {
          staticClass: "cancel-button",
          on: {
            click: function (e) {
              return t.cancel();
            }
          }
        }, [t._v("取消")]), n("GButton", {
          staticClass: "confirm-button",
          attrs: {
            type: "primary"
          },
          on: {
            click: function (e) {
              return t.ok();
            }
          }
        }, [t._v("确定")])], 1)], 1)]);
      } else {
        return t._e();
      }
    }
```