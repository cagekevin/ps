# 模板 · anon_app.v4_L32270

> 来源：`app.v4.js` render 函数 `_d`（行 32208）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<basePopup @close>
  <p>
    添加到分组
  </p>
  <Myvuescroll class="dropDown-check-context">
    <baseCheck class="mt10 check-text" v-model="selectALl">
      全选
    </baseCheck>
    <baseCheck class="mt10 check-text" @change v-model="select[i]" :class="{ existLabel: e.existed }">
      <span />
    </baseCheck>
  </Myvuescroll>
  <p class="mt10">
    *当前没有分组
  </p>
  <div class="w100 f-centerY mt15 align_right">
    <button class="btn-cancel" @click>
      取消
    </button>
    <button class="btn-ok ml10" @click>
      确定
    </button>
  </div>
</basePopup>
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
      return n("basePopup", {
        on: {
          close: function (e) {
            return t.cancel();
          }
        }
      }, [n("p", {}, [t._v("添加到分组")]), n("Myvuescroll", {
        staticClass: "dropDown-check-context"
      }, [t.data.length != 0 ? n("baseCheck", {
        staticClass: "mt10 check-text",
        model: {
          value: t.selectALl,
          callback: function (e) {
            t.selectALl = e;
          },
          expression: "selectALl"
        }
      }, [t._v("全选")]) : t._e(), t._l(t.showData, function (e, a) {
        return n("baseCheck", {
          key: a,
          staticClass: "mt10 check-text",
          class: {
            existLabel: e.existed
          },
          on: {
            change: function (n) {
              return t.baseCheckChange(e, a);
            }
          },
          model: {
            value: t.select[a],
            callback: function (e) {
              t.$set(t.select, a, e);
            },
            expression: "select[i]"
          }
        }, [n("span", [t._v(t._s(e.name))])]);
      })], 2), t.data.length == 0 ? n("p", {
        staticClass: "mt10"
      }, [t._v("*当前没有分组")]) : t._e(), n("div", {
        staticClass: "w100 f-centerY mt15 align_right"
      }, [n("button", {
        staticClass: "btn-cancel",
        on: {
          click: function (e) {
            return t.cancel();
          }
        }
      }, [t._v("取消")]), n("button", {
        staticClass: "btn-ok ml10",
        on: {
          click: function (e) {
            return t.ok();
          }
        }
      }, [t._v("确定")])])], 1);
    }
```