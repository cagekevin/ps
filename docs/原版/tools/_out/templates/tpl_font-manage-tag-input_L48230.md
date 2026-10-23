# 模板 · font-manage-tag-input

> 来源：`app.v4.js` render 函数 `yk`（行 48230）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__tag__input">
  <Input @keydown v-model="text" />
  <Icon type="clear_circle_fill" />
  <div class="font-manage__tag-input__create" @click>
    <span>
      新建\
    </span>
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
        staticClass: "font-manage__tag__input"
      }, [n("Input", {
        attrs: {
          placeholder: "标签名称不超过8个字",
          "auto-focus": true
        },
        on: {
          keydown: t.onkeydown,
          input: t.oninput
        },
        model: {
          value: t.text,
          callback: function (e) {
            t.text = e;
          },
          expression: "text"
        }
      }), t.text ? n("Icon", {
        attrs: {
          type: "clear_circle_fill"
        },
        nativeOn: {
          click: function (e) {
            e.stopPropagation();
            return t.clearText.apply(null, arguments);
          }
        }
      }) : t._e(), !t.added && t.showTag && t.text ? n("div", {
        staticClass: "font-manage__tag-input__create",
        on: {
          click: t.addTag
        }
      }, [n("span", [t._v("新建\"" + t._s(t.text) + "\"")])]) : t._e()], 1);
    }
```