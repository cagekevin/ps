# 模板 · TopicCarousel

> 来源：`app.v4.js` render 函数 `Qd`（行 33148）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="topic-carousel">
  <GCarousel class="topic-carousel__carousel" type="forward" />
  <div class="topic-carousel__dots" />
  <div class="topic-carousel__topics-btn" @click>
    <Icon type="bianzu" />
    <span>
      专题
    </span>
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
        staticClass: "topic-carousel"
      }, [n("GCarousel", {
        ref: "carousel",
        staticClass: "topic-carousel__carousel",
        attrs: {
          dotsClass: "topic-carousel__carousel__dots",
          dots: false,
          beforeChange: t.beforeChange,
          autoplay: true,
          autoplaySpeed: 5000,
          arrows: ""
        },
        scopedSlots: t._u([{
          key: "nextArrow",
          fn: function () {
            return [n("div", {
              staticStyle: {
                bottom: "32px",
                right: "4px",
                "z-index": "10",
                width: "26px",
                height: "26px"
              }
            }, [n("div", {
              staticClass: "topic-carousel__slick-arrow"
            }, [n("Icon", {
              staticStyle: {
                "font-size": "14px",
                color: "white"
              },
              attrs: {
                type: "forward"
              }
            })], 1)])];
          },
          proxy: true
        }])
      }, t._l(t.topics, function (e) {
        return n("div", {
          key: e.id,
          staticClass: "topic-carousel__topic",
          on: {
            click: function (n) {
              return t.$emit("detail", e);
            }
          }
        }, [n("img", {
          staticClass: "topic-carousel__topic__bg",
          attrs: {
            src: e.background
          }
        }), n("div", {
          staticClass: "topic-carousel__topic__bg-cover"
        }), n("div", {
          staticClass: "topic-carousel__topic__title"
        }, [t._v(t._s(e.title))]), n("div", {
          staticClass: "topic-carousel__topic__subtitle"
        }, [t._v(t._s(e.subtitle))])]);
      }), 0), t.topics.length > 1 ? n("div", {
        staticClass: "topic-carousel__dots"
      }, t._l(t.topics, function (e, a) {
        return n("div", {
          key: a,
          staticClass: "dot",
          class: {
            active: t.curIndex === a
          }
        });
      }), 0) : t._e(), n("div", {
        staticClass: "topic-carousel__topics-btn",
        on: {
          click: function (e) {
            return t.$emit("go-center");
          }
        }
      }, [n("Icon", {
        staticStyle: {
          "font-size": "16px",
          color: "white"
        },
        attrs: {
          type: "bianzu"
        }
      }), n("span", {
        staticStyle: {
          "margin-left": "2px"
        }
      }, [t._v("专题")])], 1)], 1);
    }
```