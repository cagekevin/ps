# 模板 · anon_app.v4_L1234

> 来源：`app.v4.js` render 函数 `Q`（行 1218）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<transition>
  <div class="loading-main">
    <div class="load-container load8" @click>
      <div class="loader">
        Loading...
      </div>
      <br />
      <span />
    </div>
  </div>
</transition>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("transition", [t.isShow ? n("div", {
        staticClass: "loading-main"
      }, [n("div", {
        staticClass: "load-container load8",
        on: {
          click: t.close
        }
      }, [n("div", {
        staticClass: "loader"
      }, [t._v("Loading...")]), n("br"), n("span", [t._v(t._s(t.text))])])]) : t._e()]);
    }
```