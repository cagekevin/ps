# 模板 · Set

> 来源：`56d7.js` render 函数 `ar`（行 11339）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="template-preview" @mouseenter :class="{ disabled: t.disabled, active: t.materialActive }">
  <div class="template-preview--hover__border" v-show="materialActive">
    <div class="template-preview--hover__actions" :class="{ "gap-small": t.columns > 2 } }">
      <div class="action-item" @click>
        <Icon type="down" />
      </div>
      <div class="action-item" @click>
        <Icon type="stop" />
      </div>
      <div class="action-item" @click>
        <Icon type="refresh" />
      </div>
      <div class="action-item" @click>
        <Icon type="overflow" />
      </div>
      <div class="action-item" @click>
        <Icon type="eye_fill" />
      </div>
      <div class="action-item" @click>
        <Icon type="eye_fill" />
      </div>
    </div>
    <DownloadProgress class="download-progress" @cancel />
  </div>
  <div class="template-preview--hover__border" v-show="materialActive" />
  <div class="template-preview--hover__actions" v-show="materialActive" :class="{ "gap-small": t.columns > 2 } }">
    <div class="action-item" @click>
      <Icon type="eye_fill" />
    </div>
  </div>
  <div class="template-preview--hover__pictures" v-show="materialActive" :class="{ overflow: t.pictureHoverType === "overflow", cover: t.pictureHoverType === "co" />
  <div class="template-preview--download f-center download">
    <div class="tips" />
  </div>
  <div class="template-preview--download f-center" @click>
    <div class="tips" />
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
    staticClass: "template-preview",
    class: {
      disabled: t.disabled,
      active: t.materialActive
    },
    on: {
      mouseenter: function (e) {
        return t.handleHover(true);
      },
      mouseleave: function (e) {
        return t.handleHover(false);
      },
      mousemove: t.handleMove,
      click: t.handleClick
    }
  }, [n(t.component, {
    ref: "previewInstance",
    tag: "component",
    staticClass: "template-preview__target",
    class: {
      active: t.materialActive
    },
    style: {
      "padding-bottom": t.aspectRatio * 100 + "%"
    },
    attrs: {
      template: t.template,
      minRatio: t.minRatio,
      setRatio: t.setRatio,
      maxRatio: t.maxRatio,
      lazy: t.lazy,
      hover: t.hover
    }
  }), t.pictureHoverType === "normal" || t.pictureHoverType === "overflow" ? [n("div", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.materialActive,
      expression: "materialActive"
    }],
    staticClass: "template-preview--hover__border"
  }, [n("div", {
    staticClass: "template-preview--hover__actions",
    class: {
      "gap-small": t.columns > 2
    }
  }, [t.materialType === "template" && t.downloadTask ? [t.downloadStatus === "waiting" || t.downloadStatus === "pausing" ? n("div", {
    staticClass: "action-item",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.resumeTask.apply(null, arguments);
      }
    }
  }, [n("Icon", {
    attrs: {
      type: "down"
    }
  })], 1) : t.downloadStatus === "downloading" ? n("div", {
    staticClass: "action-item",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.pauseTask.apply(null, arguments);
      }
    }
  }, [n("Icon", {
    attrs: {
      type: "stop"
    }
  })], 1) : t.downloadStatus === "error" ? n("div", {
    staticClass: "action-item",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.retryTask.apply(null, arguments);
      }
    }
  }, [n("Icon", {
    attrs: {
      type: "refresh"
    }
  })], 1) : t.downloadStatus === "done" ? [n("div", {
    staticClass: "action-item",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.showRightKeyMenu.apply(null, arguments);
      }
    }
  }, [n("Icon", {
    attrs: {
      type: "overflow"
    }
  })], 1), n("div", {
    staticClass: "action-item",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.openPreviewPage.apply(null, arguments);
      }
    }
  }, [n("Icon", {
    attrs: {
      type: "eye_fill"
    }
  })], 1)] : t._e()] : n("div", {
    staticClass: "action-item",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.openPreviewPage.apply(null, arguments);
      }
    }
  }, [n("Icon", {
    attrs: {
      type: "eye_fill"
    }
  })], 1)], 2), t.materialType === "template" && t.downloadTask && t.downloadStatus !== "done" ? n("DownloadProgress", {
    staticClass: "download-progress",
    attrs: {
      progress: t.downloadProgress,
      speed: t.downloadSpeed,
      taskStatus: t.downloadStatus,
      columns: t.columns,
      fileSize: t.fileSize
    },
    on: {
      cancel: t.cancelTask
    }
  }) : t._e()], 1)] : [n("div", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.materialActive,
      expression: "materialActive"
    }],
    staticClass: "template-preview--hover__border"
  }), n("div", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.materialActive,
      expression: "materialActive"
    }],
    staticClass: "template-preview--hover__actions",
    class: {
      "gap-small": t.columns > 2
    }
  }, [n("div", {
    staticClass: "action-item",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.openPreviewPage.apply(null, arguments);
      }
    }
  }, [n("Icon", {
    attrs: {
      type: "eye_fill"
    }
  })], 1)])], t.pictureHoverType === "overflow" || t.pictureHoverType === "cover" ? n("div", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.materialActive,
      expression: "materialActive"
    }],
    staticClass: "template-preview--hover__pictures",
    class: {
      overflow: t.pictureHoverType === "overflow",
      cover: t.pictureHoverType === "cover"
    }
  }, t._l(t.template.pictureInfos, function (e, a) {
    return n("div", {
      key: e.key,
      staticClass: "item",
      class: {
        active: t.pictureActiveIndex === a
      },
      on: {
        mouseenter: function (e) {
          t.pictureActiveIndex = a;
        },
        click: function (n) {
          n.stopPropagation();
          return t.handleClick(n, e.key);
        }
      }
    }, [n("div", {
      staticClass: "item-name"
    }, [t._v(t._s(e.keyDesc))]), t.pictureInfoShow ? n("div", {
      staticClass: "item-info"
    }, [t._v(t._s(e.width) + "x" + t._s(e.height))]) : t._e()]);
  }), 0) : t._e(), t.materialType === "template" ? [t.downloadTask ? t._e() : n("div", {
    staticClass: "template-preview--download f-center download"
  }, [n("div", {
    staticClass: "tips"
  })])] : n("div", {
    staticClass: "template-preview--download f-center",
    class: [t.downloadStatus ? t.downloadStatus : "download"],
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.handleDownloadClick.apply(null, arguments);
      }
    }
  }, [n("div", {
    staticClass: "tips"
  })])], 2);
}
```