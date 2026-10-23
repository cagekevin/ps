# 模板 · font-manage-tag-input

> 来源：`app.v4.js` render 函数 `gk`（行 48189）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__tag__creator">
  <div class="font-manage__tag__creator__header">
    <span>
      添加标签
    </span>
    <Icon type="clear_outline" />
  </div>
  <TagInput />
  <div class="font-manage__tag__creator__footer">
    <Button @click>
      取消
    </Button>
    <Button @click type="primary">
      添加
    </Button>
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
        staticClass: "font-manage__tag__creator"
      }, [n("div", {
        staticClass: "font-manage__tag__creator__header"
      }, [n("span", [t._v("添加标签")]), n("Icon", {
        attrs: {
          type: "clear_outline"
        },
        nativeOn: {
          click: function (e) {
            e.stopPropagation();
            return t.cancel.apply(null, arguments);
          }
        }
      })], 1), n("TagInput", {
        attrs: {
          "show-tag": false
        },
        on: {
          "set-text": t.setText
        }
      }), n("div", {
        staticClass: "font-manage__tag__creator__footer"
      }, [n("Button", {
        on: {
          click: t.cancel
        }
      }, [t._v("取消")]), n("Button", {
        attrs: {
          type: "primary"
        },
        on: {
          click: t.addUserTag
        }
      }, [t._v("添加")])], 1)], 1);
    }
```