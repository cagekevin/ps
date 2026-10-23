# 模板 · font-manage-search

> 来源：`app.v4.js` render 函数 `Kg`（行 44071）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__search">
  <Input @change v-model="text" />
  <Icon v-show="text" type="clear_circle_fill" />
  <Icon type="search" />
</div>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "font-manage__search"
      }, [n("Input", {
        attrs: {
          placeholder: "搜索"
        },
        on: {
          change: t.search
        },
        model: {
          value: t.text,
          callback: function (e) {
            t.text = e;
          },
          expression: "text"
        }
      }), n("Icon", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.text,
          expression: "text"
        }],
        attrs: {
          type: "clear_circle_fill"
        },
        nativeOn: {
          click: function (e) {
            e.stopPropagation();
            return t.clearText.apply(null, arguments);
          }
        }
      }), n("Icon", {
        attrs: {
          type: "search"
        },
        nativeOn: {
          click: function (e) {
            e.stopPropagation();
            return t.search.apply(null, arguments);
          }
        }
      })], 1);
    }
```