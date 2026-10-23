# 模板 · anon_app.v4_L70871

> 来源：`app.v4.js` render 函数 `a`（行 70851）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="popup" @click>
  <Myvuescroll class="popup-main" />
</div>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "popup",
        on: {
          click: t.close
        }
      }, [n("Myvuescroll", {
        staticClass: "popup-main",
        nativeOn: {
          click: function (e) {
            e.stopPropagation();
            return t.stop.apply(null, arguments);
          }
        }
      }, [t._t("default")], 2)], 1);
    }
```