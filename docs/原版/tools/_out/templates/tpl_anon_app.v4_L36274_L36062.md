# 模板 · anon_app.v4_L36274

> 来源：`app.v4.js` render 函数 `Ip`（行 36062）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="customChange-wrap" @mousedown>
  <div class="app-padding">
    <div class="f-baseX theme-mb w100">
      <baseIconInput class="inputcom-2" v-model="data.number" />
      <baseIconInput class="inputcom-2 mr0" v-model="data.scale" />
    </div>
    <div class="f-baseX theme-mb">
      <baseIconInput class="inputcom-2" v-model="data.leftRigth" />
      <baseIconInput class="inputcom-2 mr0" v-model="data.topBottom" />
    </div>
    <div class="f-baseX">
      <baseIconInput class="inputcom-2" v-model="data.angle" />
      <baseIconInput class="inputcom-2 mr0" v-model="data.opacity" />
    </div>
  </div>
  <div class="app-padding mt15">
    <div class="svg-wrap-one f-alignNone theme-mb mr5" />
    <div class="svg-wrap-two f-alignNone" />
  </div>
  <hr class="line mt15" />
  <div class="app-padding mt15 f-baseX">
    <button class="btn-2 mb0" @click>
      生成变换
    </button>
    <button class="btn-2 mb0 mr0" @click>
      重置参数
    </button>
  </div>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 2 | `v-for` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "customChange-wrap",
        on: {
          mousedown: function (t) {
            t.stopPropagation();
          }
        }
      }, [n("div", {
        staticClass: "app-padding"
      }, [n("div", {
        staticClass: "f-baseX theme-mb w100"
      }, [n("baseIconInput", {
        staticClass: "inputcom-2",
        attrs: {
          dark: true,
          name: "#iconfuzhishuliang",
          tips: "复制数量"
        },
        nativeOn: {
          keyup: function (e) {
            return t.reg("number");
          }
        },
        model: {
          value: t.data.number,
          callback: function (e) {
            t.$set(t.data, "number", e);
          },
          expression: "data.number"
        }
      }), n("baseIconInput", {
        staticClass: "inputcom-2 mr0",
        attrs: {
          dark: true,
          name: "#iconsuofangbili",
          tips: "缩放比例"
        },
        nativeOn: {
          keyup: function (e) {
            return t.reg("scale");
          }
        },
        model: {
          value: t.data.scale,
          callback: function (e) {
            t.$set(t.data, "scale", e);
          },
          expression: "data.scale"
        }
      })], 1), n("div", {
        staticClass: "f-baseX theme-mb"
      }, [n("baseIconInput", {
        staticClass: "inputcom-2",
        attrs: {
          dark: true,
          name: "#iconzuoyoujuli-1",
          tips: "左右距离"
        },
        nativeOn: {
          "!blur": function (e) {
            return t.checkLeftRight("leftRigth");
          }
        },
        model: {
          value: t.data.leftRigth,
          callback: function (e) {
            t.$set(t.data, "leftRigth", e);
          },
          expression: "data.leftRigth"
        }
      }), n("baseIconInput", {
        staticClass: "inputcom-2 mr0",
        attrs: {
          dark: true,
          name: "#iconzuoyoujuli",
          tips: "上下距离"
        },
        nativeOn: {
          "!blur": function (e) {
            return t.checkLeftRight("topBottom");
          }
        },
        model: {
          value: t.data.topBottom,
          callback: function (e) {
            t.$set(t.data, "topBottom", e);
          },
          expression: "data.topBottom"
        }
      })], 1), n("div", {
        staticClass: "f-baseX"
      }, [n("baseIconInput", {
        staticClass: "inputcom-2",
        attrs: {
          dark: true,
          name: "#iconxuanzhuanjiaodu",
          tips: "旋转角度"
        },
        nativeOn: {
          keyup: function (e) {
            return t.reg("angle");
          }
        },
        model: {
          value: t.data.angle,
          callback: function (e) {
            t.$set(t.data, "angle", e);
          },
          expression: "data.angle"
        }
      }), n("baseIconInput", {
        staticClass: "inputcom-2 mr0",
        attrs: {
          dark: true,
          name: "#icontoumingdudijian",
          tips: "透明度递减"
        },
        nativeOn: {
          keyup: function (e) {
            return t.reg("opacity");
          }
        },
        model: {
          value: t.data.opacity,
          callback: function (e) {
            t.$set(t.data, "opacity", e);
          },
          expression: "data.opacity"
        }
      })], 1)]), n("div", {
        staticClass: "app-padding mt15"
      }, [n("div", {
        staticClass: "svg-wrap-one f-alignNone theme-mb mr5"
      }, t._l(t.svgOne, function (e, a) {
        return n("svg", {
          key: "cy-cusChange" + a,
          staticClass: "icon cursor svg-18",
          attrs: {
            "aria-hidden": "true"
          },
          on: {
            click: function (e) {
              t.pointIdex = a;
            },
            mouseenter: function (e) {
              t.iconIndex = "one" + a;
            },
            mouseleave: function (e) {
              t.iconIndex = null;
            }
          }
        }, [n("use", {
          attrs: {
            "xlink:href": t.iconIndex == "one" + a || a == t.pointIdex ? "#" + e.select : "#" + e.default
          }
        })]);
      }), 0), n("div", {
        staticClass: "svg-wrap-two f-alignNone"
      }, t._l(t.svgTwo, function (e, a) {
        return n("svg", {
          key: "cy-cusChange1" + a,
          staticClass: "icon cursor svg-18",
          style: {
            visibility: a < 3 ? "visible" : "hidden"
          },
          attrs: {
            "aria-hidden": "true"
          },
          on: {
            click: function (e) {
              t.pointIdex = a + 6;
            },
            mouseenter: function (e) {
              t.iconIndex = "two" + a;
            },
            mouseleave: function (e) {
              t.iconIndex = null;
            }
          }
        }, [n("use", {
          attrs: {
            "xlink:href": t.iconIndex == "two" + a || a + 6 == t.pointIdex ? "#" + e.select : "#" + e.default
          }
        })]);
      }), 0)]), n("hr", {
        staticClass: "line mt15"
      }), n("div", {
        staticClass: "app-padding mt15 f-baseX"
      }, [n("button", {
        staticClass: "btn-2 mb0",
        on: {
          click: function (e) {
            return t.customBuildTransform();
          },
          contextmenu: function (e) {
            return t.fpCustomBuildTransform();
          }
        }
      }, [t._v(" 生成变换 ")]), n("button", {
        staticClass: "btn-2 mb0 mr0",
        on: {
          click: function (e) {
            return t.reset();
          }
        }
      }, [t._v("重置参数")])])]);
    }
```