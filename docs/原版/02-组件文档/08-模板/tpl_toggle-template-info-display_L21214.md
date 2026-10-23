# 模板 · toggle-template-info-display

> 来源：`56d7.js` render 函数 `ih`（行 21214）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div>
  <button class="button" @click>
    <Icon class="icon-filter" type="filter" />
    <sup class="selected-num-container">
      <span class="selected-num" />
    </sup>
  </button>
</div>
```

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", [n("button", {
    staticClass: "button",
    on: {
      click: function (e) {
        return t.$emit("showFilterManage");
      }
    }
  }, [n("Icon", {
    staticClass: "icon-filter",
    attrs: {
      type: "filter"
    }
  }), t.selectedNum ? n("sup", {
    staticClass: "selected-num-container"
  }, [n("span", {
    staticClass: "selected-num"
  }, [t._v(t._s(t.selectedNum))])]) : t._e()], 1), t._t("default")], 2);
}
```