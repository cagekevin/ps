# 模板 · user-font-page-dialog

> 来源：`app.v4.js` render 函数 `nC`（行 48880）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<CepModal @ok>
  <span class="font-manage__dts__tip" />
  <GInput class="font-manage__dts__tip" v-model="inputVal" />
</CepModal>
```

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("CepModal", {
        attrs: {
          title: t.context.title,
          "ok-text": t.context.okText,
          "mask-closable": true,
          "has-offset": true
        },
        on: {
          ok: t.confirm,
          cancel: t.cancel
        }
      }, [t.context.tip ? n("span", {
        staticClass: "font-manage__dts__tip"
      }, [t._v(t._s(t.context.tip))]) : t._e(), t.context.input ? n("GInput", {
        staticClass: "font-manage__dts__tip",
        model: {
          value: t.inputVal,
          callback: function (e) {
            t.inputVal = e;
          },
          expression: "inputVal"
        }
      }) : t._e()], 1);
    }
```