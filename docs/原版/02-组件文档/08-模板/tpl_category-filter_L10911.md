# 模板 · category-filter

> 来源：`56d7.js` render 函数 `ji`（行 10911）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="limite30-dialog">
  <div class="limite30-dialog-inner">
    <div class="close_box" @click>
      <IconFont type="clear_outline" />
    </div>
    <div class="title-text">
      试用期内免费下载仅限5次
    </div>
    <div class="title-text">
      试用期仅剩
    </div>
    <div class="title-text mb10">
      加入会员，即可享受
    </div>
    <div class="fucntion_item">
      <IconFont class="item_icon" :type="e.icon" />
      <div class="item_right">
        <div class="item_label" />
        <div class="item_decr" />
      </div>
    </div>
    <div class="button_box mt30">
      <div class="btn" @click>
        继续使用
      </div>
      <div class="btn upgrade_btn" @click>
        <span>
          立即加入
        </span>
      </div>
    </div>
  </div>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 1 | `v-for` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", {
    staticClass: "limite30-dialog"
  }, [n("div", {
    staticClass: "limite30-dialog-inner"
  }, [n("div", {
    staticClass: "close_box",
    on: {
      click: function (e) {
        return t.handleClose("关闭");
      }
    }
  }, [n("IconFont", {
    attrs: {
      type: "clear_outline"
    }
  })], 1), t.type === "limit" ? n("div", {
    staticClass: "title-text"
  }, [t._v("试用期内免费下载仅限5次")]) : t.type === "trailDays" ? n("div", {
    staticClass: "title-text"
  }, [t._v("试用期仅剩" + t._s(t.trailOverdueDays) + "天")]) : t._e(), n("div", {
    staticClass: "title-text mb10"
  }, [t._v("加入会员，即可享受")]), t._l(t.functionList, function (e) {
    return n("div", {
      key: e.icon,
      staticClass: "fucntion_item"
    }, [n("IconFont", {
      staticClass: "item_icon",
      attrs: {
        type: e.icon
      }
    }), n("div", {
      staticClass: "item_right"
    }, [n("div", {
      staticClass: "item_label"
    }, [t._v(t._s(e.label))]), n("div", {
      staticClass: "item_decr"
    }, [t._v(t._s(e.decr))])])], 1);
  }), n("div", {
    staticClass: "button_box mt30"
  }, [n("div", {
    staticClass: "btn",
    on: {
      click: function (e) {
        return t.handleClose("继续试用");
      }
    }
  }, [t._v("继续使用")]), n("div", {
    staticClass: "btn upgrade_btn",
    on: {
      click: function (e) {
        return t.jumpToBuy();
      }
    }
  }, [n("span", [t._v("立即加入")])])])], 2)]);
}
```