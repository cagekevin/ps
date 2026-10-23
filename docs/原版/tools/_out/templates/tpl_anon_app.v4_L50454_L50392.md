# 模板 · anon_app.v4_L50454

> 来源：`app.v4.js` render 函数 `$C`（行 50392）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="titlePopup" @click>
  <div class="title-main" @click>
    <div class="title-top f-baseX">
      <span />
    </div>
    <div class="title-content mt10">
      <Myvuescroll class="card">
        <div>
          <div class="list-item" @click v-show="i != data.index">
            <span />
          </div>
        </div>
        <div>
          <p class="cur-default">
            当前无其他仓库可选
          </p>
        </div>
      </Myvuescroll>
    </div>
    <div class="title-bottom">
      <button class="input-box-btn input-box-btn-left" @click>
        确定
      </button>
      <button class="input-box-btn " @click>
        取消
      </button>
    </div>
  </div>
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
      if (t.isShow) {
        return n("div", {
          staticClass: "titlePopup",
          class: [t.mask ? "mask" : ""],
          on: {
            click: t.cancel
          }
        }, [n("div", {
          staticClass: "title-main",
          on: {
            click: function (t) {
              t.stopPropagation();
            }
          }
        }, [n("div", {
          staticClass: "title-top f-baseX"
        }, [n("span", [t._v(t._s(t.title))])]), typeof t.data.list != "undefined" ? n("div", {
          staticClass: "title-content mt10"
        }, [n("Myvuescroll", {
          staticClass: "card"
        }, [t._l(t.data.list, function (e, a) {
          return n("div", {
            key: "ys-add" + a,
            class: [t.index == a ? "list-item-act" : ""]
          }, [n("div", {
            directives: [{
              name: "show",
              rawName: "v-show",
              value: a != t.data.index,
              expression: "i != data.index"
            }],
            staticClass: "list-item",
            on: {
              click: function (e) {
                t.index = a;
              }
            }
          }, [n("span", [t._v(t._s(e.name))])])]);
        }), t.data.list.length < 2 ? n("div", [n("p", {
          staticClass: "cur-default"
        }, [t._v("当前无其他仓库可选")])]) : t._e()], 2)], 1) : t._e(), n("div", {
          staticClass: "title-bottom"
        }, [n("button", {
          staticClass: "input-box-btn input-box-btn-left",
          on: {
            click: t.confirm
          }
        }, [t._v("确定")]), n("button", {
          staticClass: "input-box-btn ",
          on: {
            click: t.cancel
          }
        }, [t._v("取消")])])])]);
      } else {
        return t._e();
      }
    }
```