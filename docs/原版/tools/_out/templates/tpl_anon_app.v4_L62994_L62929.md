# 模板 · anon_app.v4_L62994

> 来源：`app.v4.js` render 函数 `PT`（行 62929）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="overprint-add-wrap f-center" @click>
  <div class="card relative" @click>
    <p />
    <textarea class="textarea mt15" @mousewheel v-model="strData" />
    <p class="reset" @click>
      重置
    </p>
    <p class="err" v-show="errIstrue">
      输入数值个数需在6到24个之间
    </p>
    <div class="f-center mt15">
      <button class="add-button data mb0" @click>
        确定
      </button>
      <button class="add-button close mb0 mr0" @click>
        取消
      </button>
    </div>
  </div>
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
      return n("div", {
        staticClass: "overprint-add-wrap f-center",
        on: {
          click: t.close
        }
      }, [n("div", {
        staticClass: "card relative",
        on: {
          click: function (t) {
            t.stopPropagation();
          }
        }
      }, [n("p", [t._v(t._s(t.text))]), n("textarea", {
        directives: [{
          name: "model",
          rawName: "v-model",
          value: t.strData,
          expression: "strData"
        }],
        staticClass: "textarea mt15",
        domProps: {
          value: t.strData
        },
        on: {
          mousewheel: function (t) {
            t.stopPropagation();
          },
          input: function (e) {
            if (!e.target.composing) {
              t.strData = e.target.value;
            }
          }
        }
      }), n("p", {
        staticClass: "reset",
        on: {
          click: t.resetFun
        }
      }, [t._v("重置")]), n("p", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.errIstrue,
          expression: "errIstrue"
        }],
        staticClass: "err"
      }, [t._v("输入数值个数需在6到24个之间")]), n("div", {
        staticClass: "f-center mt15"
      }, [n("button", {
        staticClass: "add-button data mb0",
        on: {
          click: t.analysis
        }
      }, [t._v("确定")]), n("button", {
        staticClass: "add-button close mb0 mr0",
        on: {
          click: t.close
        }
      }, [t._v("取消")])])])]);
    }
```