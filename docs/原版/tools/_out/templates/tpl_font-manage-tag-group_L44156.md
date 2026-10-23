# 模板 · font-manage-tag-group

> 来源：`app.v4.js` render 函数 `ab`（行 44156）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__filter-preview">
  <div class="font-manage__filter-preview__header">
    <Badge>
      <Icon type="filter" />
    </Badge>
  </div>
  <div>
    <span>
      已选
    </span>
  </div>
  <TagGroup />
</div>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "font-manage__filter-preview"
      }, [n("div", {
        ref: "filter-preview-header",
        staticClass: "font-manage__filter-preview__header"
      }, [n("Badge", {
        attrs: {
          count: t.tags.length
        },
        nativeOn: {
          click: function (e) {
            e.stopPropagation();
            return t.toggleFilterPanel.apply(null, arguments);
          }
        }
      }, [n("Icon", {
        attrs: {
          type: "filter"
        }
      })], 1)], 1), t.tags.length ? n("div", [n("span", [t._v("已选")])]) : t._e(), t.tags.length ? n("TagGroup", {
        attrs: {
          tags: t.tags,
          closable: true
        },
        on: {
          "close-tag": t.closeTag
        }
      }) : t._e()], 1);
    }
```