# 模板 · rename

> 来源：`56d7.js` render 函数 `za`（行 10154）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div>
  <div class="template-menu" v-show="$store.state.showMenu==condition">
    <div class="f-baseX svg-wrap" @click>
      <IconFont class="icon_color mr5" type="refresh" />
      <p>
        重新加载
      </p>
    </div>
    <hr class="line" />
    <div class="f-baseX svg-wrap" @click>
      <IconFont class="icon_color mr5" type="protect" />
      <p>
        授权记录
      </p>
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
  return n("div", [n("div", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.$store.state.showMenu == t.condition,
      expression: "$store.state.showMenu==condition"
    }],
    staticClass: "template-menu"
  }, [n("div", {
    staticClass: "f-baseX svg-wrap",
    on: {
      click: function (e) {
        return t.reload();
      }
    }
  }, [n("IconFont", {
    staticClass: "icon_color mr5",
    attrs: {
      type: "refresh"
    }
  }), n("p", [t._v("重新加载")])], 1), n("hr", {
    staticClass: "line"
  }), n("div", {
    staticClass: "f-baseX svg-wrap",
    on: {
      click: function (e) {
        return t.jumpToAuthRecord();
      }
    }
  }, [n("IconFont", {
    staticClass: "icon_color mr5",
    attrs: {
      type: "protect"
    }
  }), n("p", [t._v("授权记录")])], 1)])]);
}
```