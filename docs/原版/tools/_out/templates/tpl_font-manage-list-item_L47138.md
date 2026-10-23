# 模板 · font-manage-list-item

> 来源：`app.v4.js` render 函数 `tx`（行 47138）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__list-item" @click>
  <div class="font-manage__list-item__header">
    <div class="font-manage__list-item__left">
      <div class="font-manage__list-item__font-family" />
      <License />
    </div>
    <div class="font-manage__list-item__actions">
      <div>
        <Icon class="font-manage__list-item__tag" type="Tags" />
      </div>
      <Rating @rating />
    </div>
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
        staticClass: "font-manage__list-item",
        on: {
          click: t.selectFont,
          contextmenu: t.tagToFont
        }
      }, [n("div", {
        staticClass: "font-manage__list-item__header"
      }, [n("div", {
        staticClass: "font-manage__list-item__left"
      }, [n("div", {
        staticClass: "font-manage__list-item__font-family"
      }, [t._t("font-family")], 2), n("License", {
        attrs: {
          "post-script-name": t.font.postScriptNames[0],
          commercials: t.commercials
        }
      })], 1), n("div", {
        staticClass: "font-manage__list-item__actions"
      }, [n("div", [n("Icon", {
        staticClass: "font-manage__list-item__tag",
        attrs: {
          type: "Tags"
        },
        nativeOn: {
          click: function (e) {
            e.stopPropagation();
            return t.tagToFont.apply(null, arguments);
          }
        }
      })], 1), n("Rating", {
        attrs: {
          selected: t.rating
        },
        on: {
          rating: t.ratingToFont
        }
      })], 1)]), t._t("preview"), t._t("weight")], 2);
    }
```