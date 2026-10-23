# 模板 · download-list

> 来源：`56d7.js` render 函数 `cs`（行 12896）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="download-list-toolbar">
  <div />
  <div class="download-list-toolbar__buttons">
    <div class="download-list-toolbar__buttons__btn">
      <div class="download-list-toolbar__buttons__btn__icon ic-start" @click />
    </div>
    <div class="download-list-toolbar__buttons__btn">
      <div class="download-list-toolbar__buttons__btn__icon ic-pause" @click />
    </div>
    <div class="download-list-toolbar__buttons__btn">
      <div class="download-list-toolbar__buttons__btn__icon ic-remove" @click />
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
    staticClass: "download-list-toolbar"
  }, [n("div"), n("div", {
    staticClass: "download-list-toolbar__buttons"
  }, [n("div", {
    staticClass: "download-list-toolbar__buttons__btn"
  }, [n("div", {
    staticClass: "download-list-toolbar__buttons__btn__icon ic-start",
    on: {
      click: function (e) {
        return t.$emit("start");
      }
    }
  })]), n("div", {
    staticClass: "download-list-toolbar__buttons__btn"
  }, [n("div", {
    staticClass: "download-list-toolbar__buttons__btn__icon ic-pause",
    on: {
      click: function (e) {
        return t.$emit("pause");
      }
    }
  })]), n("div", {
    staticClass: "download-list-toolbar__buttons__btn"
  }, [n("div", {
    staticClass: "download-list-toolbar__buttons__btn__icon ic-remove",
    on: {
      click: function (e) {
        return t.$emit("remove");
      }
    }
  })])])]);
}
```