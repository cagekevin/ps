# 模板 · anon_app.v4_L31271

> 来源：`app.v4.js` render 函数 `ud`（行 31208）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="create-new-library f-center" @click>
  <div class="card" @click>
    <div class="create-new-library-header">
      <span>
        创建模板库
      </span>
      <Icon class="clear-icon" type="clear_outline" />
    </div>
    <div class="create-new-library-body">
      <GInput class="mt15 create-new-library_input" v-model="val" />
    </div>
    <p class="tips-err" />
    <p class="tips-text">
      例：常用排版、电商设计
    </p>
    <div class="f-center mt20">
      <GButton class="add-button data mb0 mr0" @click type="primary">
        选择保存路径
      </GButton>
    </div>
  </div>
</div>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "create-new-library f-center",
        on: {
          click: function (e) {
            return t.close();
          }
        }
      }, [n("div", {
        staticClass: "card",
        on: {
          click: function (t) {
            t.stopPropagation();
          }
        }
      }, [n("div", {
        staticClass: "create-new-library-header"
      }, [n("span", [t._v("创建模板库")]), n("Icon", {
        staticClass: "clear-icon",
        attrs: {
          type: "clear_outline"
        },
        nativeOn: {
          click: function (e) {
            return t.close.apply(null, arguments);
          }
        }
      })], 1), n("div", {
        staticClass: "create-new-library-body"
      }, [n("GInput", {
        staticClass: "mt15 create-new-library_input",
        attrs: {
          placeholder: "模版库名称"
        },
        model: {
          value: t.val,
          callback: function (e) {
            t.val = e;
          },
          expression: "val"
        }
      })], 1), t.err != "" ? n("p", {
        staticClass: "tips-err"
      }, [t._v(t._s(t.err))]) : n("p", {
        staticClass: "tips-text"
      }, [t._v("例：常用排版、电商设计")]), n("div", {
        staticClass: "f-center mt20"
      }, [n("GButton", {
        staticClass: "add-button data mb0 mr0",
        attrs: {
          type: "primary"
        },
        on: {
          click: function (e) {
            return t.ok();
          }
        }
      }, [t._v(" 选择保存路径 ")])], 1)])]);
    }
```