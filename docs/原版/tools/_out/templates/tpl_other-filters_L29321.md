# 模板 · other-filters

> 来源：`app.v4.js` render 函数 `vh`（行 29321）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div @mousedown />
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        on: {
          mousedown: t.handleMousedown,
          mouseup: t.handleMouseup,
          click: t.handleClick
        }
      }, [t._t("default")], 2);
    }
```