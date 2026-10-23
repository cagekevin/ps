# 模板 · Set

> 来源：`56d7.js` render 函数 `Ui`（行 11104）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="download-management">
  <DownloadProgressBtn @click />
  <DownloadListPanel />
</div>
```

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", {
    ref: "download-management",
    staticClass: "download-management"
  }, [n("DownloadProgressBtn", {
    attrs: {
      visible: t.visible,
      progress: t.totalDownloadProgress
    },
    on: {
      click: function (e) {
        t.visible = !t.visible;
      }
    }
  }), t.visible ? n("DownloadListPanel", {
    attrs: {
      list: t.list
    }
  }) : t._e()], 1);
}
```