# 模板 · anon_app.v4_L8941

> 来源：`app.v4.js` render 函数 `S`（行 8464）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="f-base h100" @click>
  <guide @cancel />
  <div class="f-baseY">
    <div class="app-nav-wrap">
      <div class="nav-item f-center" @mouseenter v-show="item.show">
        <svg class="icon cursor">
          <use />
        </svg>
      </div>
      <pre class="tips f-center f-size12" v-show="moveIndex == i && set.setShowTips" />
    </div>
    <div class="f-space" />
    <div class="sub-nav-wrap">
      <div class="sub-nav-item sub-nav-item-fixed" @click>
        <div class="sub-nav-item-inner">
          <svg class="icon cursor svg-16">
            <use />
          </svg>
        </div>
      </div>
      <div class="sub-nav-item f-center" @click>
        <div class="sub-nav-item-inner">
          <svg class="icon cursor svg-16">
            <use />
          </svg>
        </div>
      </div>
    </div>
  </div>
  <BuyReminderDialogWrapper @close type="trailDays" />
  <keep-alive>
    <router-view class="app-main" @openGuide />
  </keep-alive>
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
        staticClass: "f-base h100",
        attrs: {
          id: "app"
        },
        on: {
          click: t.overall
        }
      }, [t.guideSelectIstrue ? n("guide", {
        on: {
          cancel: t.closeGuide
        }
      }) : t._e(), n("div", {
        staticClass: "f-baseY",
        attrs: {
          id: "nav"
        }
      }, [t._l(t.nav.list, function (e, a) {
        return n("div", {
          key: "app" + a,
          staticClass: "app-nav-wrap",
          class: ["guide-leftnav" + a, t.navClass[a]]
        }, [n("div", {
          directives: [{
            name: "show",
            rawName: "v-show",
            value: e.show,
            expression: "item.show"
          }],
          staticClass: "nav-item f-center",
          class: [a == t.nav.index ? "nav-item-active" : ""],
          on: {
            mouseenter: function (e) {
              t.moveIndex = a;
            },
            mouseleave: function (e) {
              t.moveIndex = -1;
            },
            click: function (e) {
              return t.setNav(a);
            },
            mouseover: function (e) {
              return t.mouseNav(a);
            }
          }
        }, [n("svg", {
          staticClass: "icon cursor",
          class: e.svgSize,
          attrs: {
            "aria-hidden": "true"
          }
        }, [n("use", {
          attrs: {
            "xlink:href": e.svg
          }
        })])]), n("pre", {
          directives: [{
            name: "show",
            rawName: "v-show",
            value: t.moveIndex == a && t.set.setShowTips,
            expression: "moveIndex == i && set.setShowTips"
          }],
          staticClass: "tips f-center f-size12"
        }, [t._v(t._s(e.text))])]);
      }), n("div", {
        staticClass: "f-space"
      }), n("div", {
        staticClass: "sub-nav-wrap"
      }, [n("div", {
        staticClass: "sub-nav-item sub-nav-item-fixed",
        class: [t.set.navFixed ? "sub-nav-item-active" : ""],
        attrs: {
          title: "固定菜单不受工具关联跳转"
        },
        on: {
          click: function (e) {
            t.set.navFixed = !t.set.navFixed;
          }
        }
      }, [n("div", {
        staticClass: "sub-nav-item-inner"
      }, [n("svg", {
        staticClass: "icon cursor svg-16",
        attrs: {
          "aria-hidden": "true"
        }
      }, [n("use", {
        attrs: {
          "xlink:href": "#icongudingxuanxiangye"
        }
      })])])]), n("div", {
        staticClass: "sub-nav-item f-center",
        class: [t.nav.index == 11 ? "sub-nav-item-active" : ""],
        attrs: {
          title: "使用设置"
        },
        on: {
          click: function (e) {
            return t.toSet();
          }
        }
      }, [n("div", {
        staticClass: "sub-nav-item-inner"
      }, [n("svg", {
        staticClass: "icon cursor svg-16",
        attrs: {
          "aria-hidden": "true"
        }
      }, [n("use", {
        attrs: {
          "xlink:href": "#iconyonghushezhi"
        }
      })])])])])], 2), t.isShowTrailDialog ? n("BuyReminderDialogWrapper", {
        attrs: {
          type: "trailDays",
          trailOverdueDays: t.trailOverdueDays
        },
        on: {
          close: function (e) {
            t.isShowTrailDialog = false;
          }
        }
      }) : t._e(), n("keep-alive", [n("router-view", {
        ref: "appMain",
        staticClass: "app-main",
        attrs: {
          id: "app-main"
        },
        on: {
          openGuide: t.openGuide
        }
      })], 1)], 1);
    }
```