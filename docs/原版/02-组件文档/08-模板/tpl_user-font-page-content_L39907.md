# 模板 · user-font-page-content

> 来源：`56d7.js` render 函数 `Wx`（行 39907）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="font-manage__preview-text">
  <Icon type="zihao" />
  <Input @change v-model="text" />
  <Button @click :class="{ "font-manage__preview-text__btn--disable": !t.text }">
    应用
  </Button>
</div>
```

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", {
    staticClass: "font-manage__preview-text"
  }, [n("Icon", {
    attrs: {
      type: "zihao"
    }
  }), n("Input", {
    attrs: {
      placeholder: "请输入预览文案"
    },
    on: {
      change: t.previewText,
      keydown: t.onkeydown
    },
    model: {
      value: t.text,
      callback: function (e) {
        t.text = e;
      },
      expression: "text"
    }
  }), n("Button", {
    class: {
      "font-manage__preview-text__btn--disable": !t.text
    },
    on: {
      click: t.useText
    }
  }, [t._v("应用")])], 1);
}
```