# 模板 · Set

> 来源：`app.v4.js` render 函数 `Ni`（行 18994）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<CepModal @cancel>
  <div class="mb10">
    本地储存空间不足，请先释放空间
  </div>
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
          title: "内存不足",
          mask: false,
          hasOffset: true,
          okText: "清理缓存",
          maskClosable: false
        },
        on: {
          cancel: function (e) {
            return t.$emit("handleIsShowNoMemeryDialog", false);
          },
          ok: t.okClick
        }
      }, [n("div", {
        staticClass: "mb10"
      }, [t._v("本地储存空间不足，请先释放空间")])]);
    }
```