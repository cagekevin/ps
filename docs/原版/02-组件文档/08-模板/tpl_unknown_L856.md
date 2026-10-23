# 模板 · unknown

> 来源：`56d7.js` render 函数 `$`（行 856）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div>
  <div class="base-background" />
  <div class="guide">
    <div class="guide-title">
      新手引导
    </div>
    <div class="guide-body">
      <div class="f-baseY guide-body-menu" />
      <div>
        <div>
          <FocusAnimate />
          <div class="guide-body-content-name">
            <span class="guide-body-content-name-word">
            </span>
          </div>
        </div>
        <div :style="{ marginTop: t.currentIndex * 40 + "px" } }">
          <div class="guide-body-content-name">
            <span class="guide-body-content-name-word">
            </span>
          </div>
          <div class="guide-body-content-video">
            <video class="guide-body-content-video-player">
              <source :src="t.menuData[t.currentIndex].video" type="video/mp4" />
              <p>
                你的程序暂不支持播放视频，
                <a>
                  点击这里
                </a>
                查看功能预览
              </p>
            </video>
            <div class="guide-body-content-video-offline f-centerX">
              <NewSpin class="guide-body-content-video-offline-icon" />
            </div>
          </div>
          <div class="guide-body-content-functions" />
          <div class="guide-body-content-content">
          </div>
          <div class="guide-body-content-know-more">
            <span @click>
              了解如何使用
            </span>
          </div>
        </div>
      </div>
    </div>
    <div class="guide-cancel">
      <div class="guide-cancel-icon" @click>
        ✕
      </div>
    </div>
  </div>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 3 | `v-for` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var n = t._self._c || e;
  return n("div", [n("div", {
    staticClass: "base-background",
    class: t.isSupportFilter ? "base-background-support" : "base-background-not-support"
  }), n("div", {
    staticClass: "guide"
  }, [n("div", {
    staticClass: "guide-title"
  }, [t._v("新手引导")]), n("div", {
    staticClass: "guide-body"
  }, [n("div", {
    staticClass: "f-baseY guide-body-menu"
  }, t._l(t.menuData, function (e, a) {
    return n("div", {
      key: "menu" + a,
      staticClass: "guide-body-menu-item",
      class: {
        "guide-body-menu-item-current": t.currentIndex === a
      },
      on: {
        mouseenter: function (e) {
          return t.enter(a);
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
        "xlink:href": e.icon
      }
    })])]);
  }), 0), n("div", [t.currentIndex === -1 ? n("div", [n("FocusAnimate"), t._l(t.menuData, function (e, a) {
    return n("div", {
      key: "name" + a,
      staticClass: "guide-body-content-name"
    }, [t._v(" " + t._s(e.name) + " "), n("span", {
      staticClass: "guide-body-content-name-word"
    }, [t._v(" " + t._s(e.word) + " ")])]);
  })], 2) : n("div", {
    style: {
      marginTop: t.currentIndex * 40 + "px"
    }
  }, [n("div", {
    staticClass: "guide-body-content-name"
  }, [t._v(" " + t._s(t.menuData[t.currentIndex].name) + " "), n("span", {
    staticClass: "guide-body-content-name-word"
  }, [t._v(" " + t._s(t.menuData[t.currentIndex].word) + " ")])]), t.menuData[t.currentIndex].scope.includes("video") ? n("div", {
    staticClass: "guide-body-content-video"
  }, [t.isOnline ? n("video", {
    ref: "guideVideo",
    staticClass: "guide-body-content-video-player",
    attrs: {
      autoplay: "",
      loop: "",
      muted: "",
      width: "100%"
    },
    domProps: {
      muted: true
    }
  }, [n("source", {
    attrs: {
      src: t.menuData[t.currentIndex].video,
      type: "video/mp4"
    }
  }), n("p", [t._v(" 你的程序暂不支持播放视频， "), n("a", {
    attrs: {
      href: t.menuData[t.currentIndex].video
    }
  }, [t._v("点击这里")]), t._v(" 查看功能预览 ")])]) : n("div", {
    staticClass: "guide-body-content-video-offline f-centerX"
  }, [n("NewSpin", {
    staticClass: "guide-body-content-video-offline-icon"
  })], 1)]) : t._e(), t.menuData[t.currentIndex].scope.includes("functions") ? n("div", {
    staticClass: "guide-body-content-functions"
  }, t._l(t.menuData[t.currentIndex].functions, function (e, a) {
    return n("div", {
      key: "function" + a
    }, [n("span", [t._v(t._s(e.name))]), n("span", {
      staticClass: "guide-body-content-functions-value"
    }, [t._v(" " + t._s("：" + e.value) + " ")])]);
  }), 0) : t._e(), t.menuData[t.currentIndex].scope.includes("content") ? n("div", {
    staticClass: "guide-body-content-content"
  }, [t._v(" " + t._s(t.menuData[t.currentIndex].content) + " ")]) : t._e(), n("div", {
    staticClass: "guide-body-content-know-more"
  }, [n("span", {
    on: {
      click: function (e) {
        return t.$cep.openUrl(t.menuData[t.currentIndex].knowMore);
      }
    }
  }, [t._v(" 了解如何使用 ")])])])])]), n("div", {
    staticClass: "guide-cancel"
  }, [n("div", {
    staticClass: "guide-cancel-icon",
    on: {
      click: t.cancel
    }
  }, [t._v("✕")])])])]);
}
```