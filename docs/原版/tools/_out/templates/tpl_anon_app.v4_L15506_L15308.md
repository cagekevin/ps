# 模板 · anon_app.v4_L15506

> 来源：`app.v4.js` render 函数 `Bn`（行 15308）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="success-alert">
  <div class="success-alert__text">
    <div class="success-alert__text__fileName">
      “
    </div>
    <div>
      ”
    </div>
    <div>
      已下载完成。
    </div>
    <span class="success-alert__text__use" @click>
      创建设计稿
    </span>
  </div>
  <div class="success-alert__delete" @click>
    <GIcon type="clear_outline" />
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
        staticClass: "success-alert"
      }, [n("div", {
        staticClass: "success-alert__text"
      }, [n("div", {
        staticClass: "success-alert__text__fileName"
      }, [t._v("“" + t._s(t.fileName))]), n("div", [t._v("”")]), n("div", [t._v("已下载完成。")]), n("span", {
        staticClass: "success-alert__text__use",
        on: {
          click: t.openFile
        }
      }, [t._v("创建设计稿")])]), n("div", {
        staticClass: "success-alert__delete",
        on: {
          click: t.closeMessage
        }
      }, [n("GIcon", {
        staticStyle: {
          color: "#FFFFFF",
          "font-size": "16px"
        },
        attrs: {
          type: "clear_outline"
        }
      })], 1)]);
    }
```