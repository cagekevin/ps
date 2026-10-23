# 模板 · anon_app.v4_L29758

> 来源：`app.v4.js` render 函数 `Gh`（行 29652）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="recycle-delete-loading">
  <div class="loading_inner">
    <GDIcon class="loading_icon" type="loading" />
    <div />
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
        staticClass: "recycle-delete-loading"
      }, [n("div", {
        staticClass: "loading_inner"
      }, [n("GDIcon", {
        staticClass: "loading_icon",
        attrs: {
          type: "loading"
        }
      }), n("div", [t._v(t._s(t.handleTemplateLoadingText))])], 1)]);
    }
```