# 模板 · anon_app.v4_L32270

> 来源：`app.v4.js` render 函数 `wd`（行 31650）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="label-manage-panel">
  <div class="title_bar">
    <div class="back_icon" @click>
      <IconFont type="chevron_left" />
    </div>
    <span>
      标签管理
    </span>
  </div>
  <templateLabel @filterListByTag />
</div>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "label-manage-panel"
      }, [n("div", {
        staticClass: "title_bar"
      }, [n("div", {
        staticClass: "back_icon",
        on: {
          click: function (e) {
            return t.backIconClick();
          }
        }
      }, [n("IconFont", {
        attrs: {
          type: "chevron_left"
        }
      })], 1), n("span", [t._v("标签管理")])]), n("templateLabel", {
        on: {
          filterListByTag: t.filterListByTag
        }
      })], 1);
    }
```