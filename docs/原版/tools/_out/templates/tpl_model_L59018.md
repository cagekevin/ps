# 模板 · model

> 来源：`app.v4.js` render 函数 `cO`（行 59018）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<a class="f-center">
  <svg class="icon">
    <use />
  </svg>
</a>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("a", {
        staticClass: "f-center",
        attrs: {
          title: t.title
        }
      }, [n("svg", {
        staticClass: "icon",
        class: [t.svgClass],
        attrs: {
          "aria-hidden": "true"
        }
      }, [n("use", {
        attrs: {
          "xlink:href": t.name
        }
      })])]);
    }
```