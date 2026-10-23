# 模板 · Set

> 来源：`56d7.js` render 函数 `Wi`（行 11128）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div />
```

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", t._g(t._b({
    staticClass: "download-progress-btn"
  }, "div", t.$attrs, false), t.$listeners), [n("div", {
    class: {
      "download-progress-btn--active": t.visible
    }
  }), n("svg", {
    attrs: {
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg"
    }
  }, [n("path", {
    attrs: {
      "fill-rule": "evenodd",
      "clip-rule": "evenodd",
      d: "M12 20a8 8 0 100-16 8 8 0 000 16zm2.54-7.96l-1.89 1.89V7.5h-1.3v6.43l-1.89-1.89-.92.92 3 3 .46.46.46-.46 3-3-.92-.92z",
      fill: "#fff"
    }
  }), t.progress > 0 ? n("circle", {
    attrs: {
      cx: "50%",
      cy: "50%",
      r: "10",
      "stroke-width": "1.5",
      stroke: "#3565FF",
      fill: "none",
      "stroke-linecap": "round",
      transform: "rotate(-90 12 12)",
      "stroke-dasharray": t.strokeDasharray
    }
  }) : t._e()])]);
}
```