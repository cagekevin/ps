# 模板 · anon_app.v4_L65123

> 来源：`app.v4.js` render 函数 `QI`（行 64882）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="topic-detail">
  <TopicBanner @back />
  <TopicTags v-model="currentModule" />
  <div class="list-container">
    <div class="list-container-inner">
      <div class="list-wrapper">
        <MaterialList class="list" @expose :type="t.materialType" />
        <TemplateList class="list" @expose />
        <div class="loading-next-page">
          加载中…
        </div>
      </div>
    </div>
  </div>
  <LimitationDialog @close />
  <NoMemoryDialog @handleIsShowNoMemeryDialog />
  <div class="template-preview" @click>
    <Preview />
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
        staticClass: "topic-detail"
      }, [t.topic ? n("TopicBanner", {
        staticStyle: {
          "flex-shrink": "0"
        },
        attrs: {
          topic: t.topic,
          collapse: t.collapse
        },
        on: {
          back: t.routeBack,
          "go-center": t.routeToCenter
        }
      }) : t._e(), t.currentModule ? n("TopicTags", {
        staticStyle: {
          "flex-shrink": "0"
        },
        attrs: {
          tags: t.modules
        },
        model: {
          value: t.currentModule,
          callback: function (e) {
            t.currentModule = e;
          },
          expression: "currentModule"
        }
      }) : t._e(), n("div", {
        staticClass: "list-container"
      }, [!t.initialLoading && t.list.length ? n("div", {
        staticClass: "list-container-inner"
      }, [n("div", {
        staticClass: "list-wrapper"
      }, [t.topicType === "material" && t.materialType ? [n("MaterialList", {
        ref: "list",
        staticClass: "list",
        attrs: {
          type: t.materialType,
          materials: t.list,
          columns: 2,
          visible: !t.initialLoading,
          loading: t.loading,
          loadedAll: t.loadedAll,
          nextPage: t.nextPage,
          updater: t.collapse
        },
        on: {
          expose: t.expose,
          scroll: t.onScrollList,
          download: t.onDownload
        }
      })] : t.topicType === "template" ? [n("TemplateList", {
        ref: "list",
        staticClass: "list",
        attrs: {
          materials: t.list,
          columns: 2,
          visible: !t.initialLoading,
          loading: t.loading,
          loadedAll: t.loadedAll,
          nextPage: t.nextPage,
          updater: t.collapse
        },
        on: {
          expose: t.expose,
          scroll: t.onScrollList,
          download: t.onDownload
        }
      })] : t._e(), t.loading ? n("div", {
        staticClass: "loading-next-page"
      }, [t._v("加载中…")]) : t._e()], 2)]) : t._e()]), t.visible && t.isTryLimitShown ? n("LimitationDialog", {
        on: {
          close: t.closeTryLimitDialog
        }
      }) : t._e(), t.visible && t.isShowNoMemoryDialog ? n("NoMemoryDialog", {
        on: {
          handleIsShowNoMemeryDialog: t.handleIsShowNoMemeryDialog
        }
      }) : t._e(), t.previewInfo ? n("div", {
        staticClass: "template-preview",
        on: {
          click: t.closePreview
        }
      }, [n("Preview", {
        attrs: {
          previewInfo: t.previewInfo,
          materialType: t.topicType
        }
      })], 1) : t._e()], 1);
    }
```