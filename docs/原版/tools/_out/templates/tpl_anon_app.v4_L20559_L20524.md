# 模板 · anon_app.v4_L20559

> 来源：`app.v4.js` render 函数 `Gr`（行 20524）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="dropDown-wrap" @click v-show="$store.state.showMenu === condition">
  <div class="item" @click>
    创建设计稿
  </div>
  <div class="item" @click>
    应用到当前设计稿
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
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.$store.state.showMenu === t.condition,
          expression: "$store.state.showMenu === condition"
        }],
        ref: "menu",
        staticClass: "dropDown-wrap",
        on: {
          click: function (e) {
            return t.close();
          }
        }
      }, [n("div", {
        staticClass: "item",
        on: {
          click: function (e) {
            return t.openFile();
          }
        }
      }, [t._v("创建设计稿")]), n("div", {
        staticClass: "item",
        on: {
          click: function (e) {
            return t.useFile();
          }
        }
      }, [t._v("应用到当前设计稿")])]);
    }
```