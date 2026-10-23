# 模板 · anon_app.v4_L65123

> 来源：`app.v4.js` render 函数 `tF`（行 64978）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="topic-banner">
  <img class="topic-banner__bg" :src="t.topic.background" />
  <div class="topic-banner__bg-cover" :class="{ collapse: t.collapse } }" />
  <div class="topic-banner__info">
    <div class="topic-banner__title" :class="{ collapse: t.collapse } }" />
    <div class="topic-banner__subtitle" :class="{ collapse: t.collapse } }" />
  </div>
  <div class="topic-nav">
    <div class="topic-nav__back" @click>
      <Icon type="back" />
    </div>
    <div class="topic-nav__topics-btn" @click>
      <Icon type="bianzu" />
      <span>
        专题
      </span>
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
        staticClass: "topic-banner",
        style: t.bannerStyle
      }, [n("img", {
        staticClass: "topic-banner__bg",
        attrs: {
          src: t.topic.background
        }
      }), n("div", {
        staticClass: "topic-banner__bg-cover",
        class: {
          collapse: t.collapse
        }
      }), n("div", {
        staticClass: "topic-banner__info"
      }, [n("div", {
        staticClass: "topic-banner__title",
        class: {
          collapse: t.collapse
        }
      }, [t._v(t._s(t.topic.title))]), n("div", {
        staticClass: "topic-banner__subtitle",
        class: {
          collapse: t.collapse
        }
      }, [t._v(t._s(t.topic.subtitle))])]), n("div", {
        staticClass: "topic-nav"
      }, [n("div", {
        staticClass: "topic-nav__back",
        on: {
          click: function (e) {
            return t.$emit("back", e);
          }
        }
      }, [n("Icon", {
        staticStyle: {
          "font-size": "20px",
          color: "white"
        },
        attrs: {
          type: "back"
        }
      })], 1), n("div", {
        staticClass: "topic-nav__topics-btn",
        on: {
          click: function (e) {
            return t.$emit("go-center", e);
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
      }, [t._v("专题")])], 1)])]);
    }
```