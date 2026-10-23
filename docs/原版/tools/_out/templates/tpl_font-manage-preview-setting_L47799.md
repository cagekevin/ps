# 模板 · font-manage-preview-setting

> 来源：`app.v4.js` render 函数 `Vx`（行 47799）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<Footer />
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("Footer", {
        attrs: {
          "preview-text": t.previewText,
          "preview-mode": t.previewMode
        },
        on: {
          "use-text": t.useText,
          "set-preview-text": t.setPreviewText,
          "set-preview-mode": t.setPreviewMode
        }
      });
    }
```