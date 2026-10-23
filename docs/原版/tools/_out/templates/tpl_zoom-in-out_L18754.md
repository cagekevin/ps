# 模板 · zoom-in-out

> 来源：`app.v4.js` render 函数 `xi`（行 18754）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<Button />
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("Button", {
        class: ["select-button", {
          "select-button--selected": t.selected
        }],
        attrs: {
          size: t.size
        }
      }, [t._t("default")], 2);
    }
```