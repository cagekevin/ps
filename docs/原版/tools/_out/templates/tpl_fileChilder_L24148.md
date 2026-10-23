# 模板 · fileChilder

> 来源：`app.v4.js` render 函数 `Fc`（行 24148）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="f-space f-arrayY w100 lazyWrap relative" @click>
  <RelateTag @close />
  <moveFileToFolder @close />
  <input class="input-preview" @keyup v-model="tempInput" type="text" />
  <div class="preview-img-wrap f-center" @click>
    <baseSvg class="preview-colse" @handle />
    <img @click :src="t.previewImg" />
  </div>
  <TemplateItemDropdownMenu @showMoveFile :style="{ left: t.fileMenuX, top: t.fileMenuY }" />
  <div class="w100 search-and-filter" v-show="data.showType !== 2">
    <InputSearch class="input-search" @search v-model="findText" />
    <OtherFilters class="other-filters" @filterTime />
  </div>
  <div class="mobile-wrap w100 f-arrayY" v-show="data.status">
    <FileNav @changeId />
    <filecom class="filecom" @changeId />
    <ShowFolderSubFolder @openFolder />
  </div>
  <div class="app-padding mt6 mb3 total_text">
    共
    <span class="ml2 mr2" />
    个内容
  </div>
  <div class="f-space lazy preview list-container" @scroll>
    <div class="get-preview-height">
      <div class="column-item">
        <pre class="w100">
          测试文档
        </pre>
        <p>
          600 x 800
        </p>
      </div>
    </div>
    <div class="list-wrapper" v-show="imgList.length > 0">
      <div class="img-main" />
      <BackTop class="list-back-top" />
    </div>
    <ListLoading class="list-loading" v-show="loading" />
    <emptyRecycle />
    <NoResult class="no-result" />
    <EmptyLibrary class="empty-library" @importFolder />
  </div>
  <NoLibrary class="no-library" @createNewTemplate />
  <div class="bottom-nav app-padding f-baseX">
    <div class="bottom-left">
      <Sortcom @topFun />
      <ToggleTemplateInfoDisplay class="bottom-toggle-display" @toggleNameShow />
    </div>
    <div>
      <div class="f-space" />
      <ZoomInOut @change />
    </div>
  </div>
  <fileSvg @closeFileSvg />
  <AddTemplate @addToOneTemplate />
  <RecycleDeleteLoading />
  <CepModal @cancel>
    该操作不能撤销，确定继续？
  </CepModal>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 1 | `v-for` |
| `if` 条件分支 | 1 | `v-if` / `v-else` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", {
        staticClass: "f-space f-arrayY w100 lazyWrap relative",
        on: {
          click: function (e) {
            return t.clickClear();
          },
          drop: function (e) {
            return t.dropAdd(e);
          }
        }
      }, [t.showTags ? n("RelateTag", {
        attrs: {
          select: t.selectArr
        },
        on: {
          close: function (e) {
            t.showTags = false;
          },
          toggleTagPanelVisible: t.toggleTagPanelVisible
        }
      }) : t._e(), t.showMoveFile ? n("moveFileToFolder", {
        attrs: {
          isAddTemplate: t.isAddTemplate
        },
        on: {
          close: function (e) {
            t.showMoveFile = false;
          },
          ok: function (e) {
            return t.moveFileToFolderHandle(e);
          }
        }
      }) : t._e(), n("input", {
        directives: [{
          name: "model",
          rawName: "v-model",
          value: t.tempInput,
          expression: "tempInput"
        }],
        ref: "inputPreview",
        staticClass: "input-preview",
        attrs: {
          type: "text"
        },
        domProps: {
          value: t.tempInput
        },
        on: {
          keyup: t.keyup,
          input: function (e) {
            if (!e.target.composing) {
              t.tempInput = e.target.value;
            }
          }
        }
      }), t.previewImg != null ? n("div", {
        staticClass: "preview-img-wrap f-center",
        on: {
          click: function (e) {
            t.previewImg = null;
          },
          mousewheel: function (e) {
            return t.scaleFun(e);
          }
        }
      }, [n("baseSvg", {
        staticClass: "preview-colse",
        attrs: {
          name: "#iconguanbi"
        },
        on: {
          handle: function (e) {
            t.previewImg = null;
          }
        }
      }), t._v(" " + t._s(t.clix) + " "), n("img", {
        ref: "previewImg",
        attrs: {
          height: "auto",
          width: "100%",
          src: t.previewImg
        },
        on: {
          click: function (t) {
            t.stopPropagation();
          },
          mousedown: function (e) {
            return t.previewImgFun(e);
          },
          dragstart: function (t) {
            t.preventDefault();
          }
        }
      })], 1) : t._e(), n("TemplateItemDropdownMenu", {
        ref: "fileMenu",
        style: {
          left: t.fileMenuX,
          top: t.fileMenuY
        },
        attrs: {
          show: t.showFileMenu,
          select: t.selectArr
        },
        on: {
          showMoveFile: function (e) {
            t.showMoveFile = true;
          },
          updataName: function (e) {
            return t.updataName();
          },
          updataPreview: function (e) {
            return t.menuUpdataPreview(e);
          },
          changePreviewImg: t.changePreviewImg,
          showTags: function (e) {
            t.showTags = true;
          },
          useTempInCurrentDoc: t.useTempInCurrentDoc,
          setAddTemplateType: t.setAddTemplateType,
          setIsShowDeleteTemLoading: t.setIsShowDeleteTemLoading,
          setHandleTemplateLoadingText: t.setHandleTemplateLoadingText,
          close: function (e) {
            t.showFileMenu = false;
          }
        },
        nativeOn: {
          click: function (t) {
            t.stopPropagation();
          }
        }
      }), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.data.showType !== 2,
          expression: "data.showType !== 2"
        }],
        staticClass: "w100 search-and-filter"
      }, [n("InputSearch", {
        staticClass: "input-search",
        attrs: {
          size: "small"
        },
        on: {
          search: t.onSearch
        },
        model: {
          value: t.findText,
          callback: function (e) {
            t.findText = e;
          },
          expression: "findText"
        }
      }), n("OtherFilters", {
        staticClass: "other-filters",
        attrs: {
          scoreOptions: t.serchLabelData[1] ? t.serchLabelData[1].data.text : [],
          timeOptions: t.serchLabelData[2] ? t.serchLabelData[2].data.text : [],
          time: t.timeVal,
          scores: t.scoreVal,
          tags: t.tagVal,
          optionsInfo: t.listService && t.listService.serchLabelData,
          selectedNum: t.filterNum
        },
        on: {
          filterTime: t.filterTime,
          filterScore: t.filterScore,
          filterTag: t.filterTag,
          visibleChange: t.handleVisibleChange
        }
      })], 1), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.data.status,
          expression: "data.status"
        }],
        staticClass: "mobile-wrap w100 f-arrayY",
        attrs: {
          id: "template-eagleMapContainer"
        }
      }, [n("FileNav", {
        attrs: {
          fileDropDown: t.fileDropDown,
          tagsText: t.tagsText,
          historyFolderRecords: t.historyFolderRecords,
          pathName: t.pathName
        },
        on: {
          changeId: t.changeId,
          updataPreviewList: t.updataPreviewList,
          dropOpen: t.dropOpen,
          openFolder: t.openFolder,
          openFolderForward: t.openFolderForward
        }
      }), n("filecom", {
        ref: "filecom",
        staticClass: "filecom",
        on: {
          changeId: t.changeId,
          isOpen: function (e) {
            return t.isOpen(e, "fileDropDown");
          }
        }
      }), n("ShowFolderSubFolder", {
        attrs: {
          columnNum: t.columnNum
        },
        on: {
          openFolder: t.openFolder
        }
      })], 1), t.data.showList.length ? n("div", {
        staticClass: "app-padding mt6 mb3 total_text"
      }, [t._v(" 共 "), n("span", {
        staticClass: "ml2 mr2"
      }, [t._v(t._s(t.data.showList.length))]), t._v(" 个内容 ")]) : t._e(), t.data.status ? n("div", {
        ref: "lazy",
        staticClass: "f-space lazy preview list-container",
        staticStyle: {
          height: "0"
        },
        on: {
          scroll: function (e) {
            return t.templateListScrollCallback(e);
          }
        }
      }, [n("div", {
        staticClass: "get-preview-height"
      }, [n("div", {
        ref: "previewHeight",
        staticClass: "column-item",
        class: ["column-" + t.columnNum]
      }, [t.set.mbShowName ? n("pre", {
        staticClass: "w100"
      }, [t._v("测试文档")]) : t._e(), t.set.mbShowPsdSize ? n("p", [t._v("600 x 800")]) : t._e()])]), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.imgList.length > 0,
          expression: "imgList.length > 0"
        }],
        ref: "list-wrapper",
        staticClass: "list-wrapper"
      }, [n("div", {
        staticClass: "img-main"
      }, t._l(t.batchShowList, function (e, a) {
        return n("div", {
          key: "mb-Own4" + a,
          staticClass: "column-item",
          class: [t.selectStatus[a], "column-" + t.columnNum, "previe-item-" + a],
          style: t.showPosition[a],
          attrs: {
            title: "按空格查看大图",
            id: "previe-item-" + a
          },
          on: {
            mouseover: function (e) {
              return t.setPreviewFocus(a);
            },
            mouseleave: t.removePreviewFocus,
            click: function (e) {
              return t.clickPreview(a);
            },
            contextmenu: function (e) {
              e.preventDefault();
              return t.showPreviewMenu(e, a);
            }
          }
        }, [n("img", {
          attrs: {
            width: "100%",
            src: t.isMac + t.imgList[a]
          },
          on: {
            load: function (e) {
              return t.loadImg();
            },
            error: t.loadImg,
            click: function (e) {
              e.stopPropagation();
              return t.clickPreview(a);
            },
            contextmenu: function (e) {
              e.preventDefault();
              e.stopPropagation();
              return t.showPreviewMenu(e, a);
            }
          }
        }), n("div", {
          staticClass: "template-preview--hover"
        }, [n("div", {
          staticClass: "template-preview--hover__eyes",
          on: {
            click: function (n) {
              n.stopPropagation();
              return t.openPreviewPage(e, a);
            }
          }
        }, [n("Icon", {
          staticStyle: {
            "font-size": "17px"
          },
          attrs: {
            type: "eye_fill"
          }
        })], 1)]), t.set.mbShowName ? n("pre", {
          staticClass: "w100 showFullName",
          on: {
            click: function (e) {
              e.stopPropagation();
              return t.clickPreview(a);
            },
            contextmenu: function (e) {
              e.preventDefault();
              e.stopPropagation();
              return t.showPreviewMenu(e, a);
            }
          }
        }, [t._v(t._s(e.name))]) : t._e(), n("p", {
          directives: [{
            name: "show",
            rawName: "v-show",
            value: t.set.mbShowPsdSize,
            expression: "set.mbShowPsdSize"
          }]
        }, [t._v(t._s(e.width) + "x" + t._s(e.height))])]);
      }), 0), n("BackTop", {
        staticClass: "list-back-top",
        attrs: {
          target: t.getBackTopTarget
        }
      })], 1), n("ListLoading", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.loading,
          expression: "loading"
        }],
        staticClass: "list-loading",
        attrs: {
          tip: "导入中…"
        }
      }), t.imgList.length == 0 && t.data.showType == 2 ? n("emptyRecycle") : t.imgList.length == 0 && t.hasSearchedOrFiltered ? n("NoResult", {
        staticClass: "no-result"
      }) : t.imgList.length != 0 || t.hasSearchedOrFiltered ? t._e() : n("EmptyLibrary", {
        staticClass: "empty-library",
        on: {
          importFolder: t.importFolder,
          importPack: t.importPack
        }
      })], 1) : n("NoLibrary", {
        staticClass: "no-library",
        on: {
          createNewTemplate: t.createNewTemplate,
          openTemplate: t.openTemplate
        }
      }), n("div", {
        staticClass: "bottom-nav app-padding f-baseX"
      }, [n("div", {
        staticClass: "bottom-left"
      }, [n("Sortcom", {
        on: {
          topFun: t.bottomSortTop,
          bottomFun: t.bottomSortBottom
        }
      }), n("ToggleTemplateInfoDisplay", {
        ref: "test",
        staticClass: "bottom-toggle-display",
        attrs: {
          showName: t.set.mbShowName,
          showSize: t.set.mbShowPsdSize
        },
        on: {
          toggleNameShow: t.setShowName,
          togglePsdSizeShow: t.togglePsdSizeShow
        }
      })], 1), n("div", [n("div", {
        staticClass: "f-space"
      }), n("ZoomInOut", {
        attrs: {
          columns: t.columnNum
        },
        on: {
          change: t.handleColumnChange
        }
      })], 1)]), t.setFolderIcon != "" ? n("fileSvg", {
        attrs: {
          setFolderIconInfo: t.setFolderIconInfo
        },
        on: {
          closeFileSvg: function (e) {
            t.setFolderIcon = "";
          },
          confirmFun: t.confirmFunFileSvg
        }
      }) : t._e(), n("AddTemplate", {
        attrs: {
          addToTemplateMode: t.addToTemplateMode
        },
        on: {
          addToOneTemplate: t.addTemplate,
          addToMultipleTemplates: t.addToMultipleTemplates
        }
      }), t.isShowDeleteTemLoading ? n("RecycleDeleteLoading", {
        attrs: {
          handleTemplateLoadingText: t.handleTemplateLoadingText
        }
      }) : t._e(), t.isShowForEverDeleteDialog ? n("CepModal", {
        attrs: {
          title: "永久删除",
          mask: false,
          hasOffset: true
        },
        on: {
          cancel: function (e) {
            t.isShowForEverDeleteDialog = false;
          },
          ok: t.foreverDeleteOkClick
        }
      }, [t._v(" 该操作不能撤销，确定继续？ ")]) : t._e()], 1);
    }
```