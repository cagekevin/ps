# 模板 · anon_app.v4_L36820

> 来源：`app.v4.js` render 函数 `Lp`（行 36435）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div class="export-wrap" @mousedown>
  <div class="app-padding">
    <div class="f-baseX">
      <div class="switch-wrap f-baseX" />
      <div class="f-space" />
      <p class="f-size12 mr7">
        品质
      </p>
      <div class="relative">
        <baseInput class="switch-input" v-model="set.cyExport.quality" />
        <div class="png-div f-baseX" @click>
          <baseSvg class="png-svg svg-10" @handle />
        </div>
        <div class="switch-input-context" v-show="switchInputOpen" />
      </div>
    </div>
    <div class="f-arrayX theme-mt-row">
      <p class="f-size12 mr8 mt6">
        保存到
      </p>
      <div class="f-space">
        <baseInput class="  mb8" v-model="set.cyExport.path">
          <baseIcon @handle />
        </baseInput>
        <div class="f-base">
          <baseRadio v-model="set.cyExport.pathType">
            桌面
          </baseRadio>
          <baseRadio class="ml30" v-model="set.cyExport.pathType">
            文件所在目录
          </baseRadio>
        </div>
      </div>
    </div>
    <div class="f-arrayX theme-mt-row">
      <p class="f-size12 mr20 mt6">
        命名
      </p>
      <div class="f-space">
        <baseInput class=" mb8" v-model="set.cyExport.name" />
        <div class="f-baseX ">
          <baseCheck v-model="set.cyExport.layerName">
            图层名
          </baseCheck>
          <baseCheck class="ml17" v-model="set.cyExport.isNumber">
            自动编号
          </baseCheck>
        </div>
      </div>
    </div>
  </div>
  <hr class="line theme-mt-row" />
  <div class="app-padding">
    <baseRadio class="theme-mt-row" v-model="set.cyExport.saveType">
      使用导出Web方式(可以切片)
    </baseRadio>
    <baseRadio class="theme-mt-row" v-model="set.cyExport.saveType">
      使用另存为方式(不压缩)
    </baseRadio>
  </div>
  <hr class="line theme-mt-row" />
  <div class="mt10">
    <baseOpen class="app-padding" v-model="set.cyShowCompress">
      <div class="f-baseX mt10">
        <div class="f-space mr10">
          <baseInput class=" theme-mb" v-model="set.cyExport.compress.width" />
        </div>
        <div class="f-space">
          <baseInput class=" mr0 theme-mb" v-model="set.cyExport.compress.height" />
        </div>
      </div>
      <baseInput class=" " v-model="set.cyExport.compress.watermark">
        <baseIcon @handle />
      </baseInput>
      <baseCheck class="mt10" v-model="set.cyExport.compress.exportOriginalGraph">
        同时导出原图
      </baseCheck>
    </baseOpen>
    <hr class="line theme-mt-row" />
    <baseOpen class="theme-mt-row app-padding" v-model="set.cyShowSetFolder">
      <div>
        <button class="btn-1 mt10" @click>
          打开所在目录
        </button>
        <baseCheck v-model="set.cyExport.autoOpenFolder">
          保存后自动打开所在目录
        </baseCheck>
      </div>
    </baseOpen>
    <hr class="line theme-mt-row" />
    <baseOpen class="theme-mt-row app-padding" v-model="set.cyShowBatch">
      <div>
        <button class="btn-2 mt10" @click>
          导出一级图层
        </button>
        <button class="btn-2 mr0" @click>
          导出二级图层
        </button>
        <button class="btn-1 mb0" @click>
          批量导出文件夹所有PSD
        </button>
      </div>
    </baseOpen>
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
        staticClass: "export-wrap",
        on: {
          mousedown: function (t) {
            t.stopPropagation();
          }
        }
      }, [n("div", {
        staticClass: "app-padding"
      }, [n("div", {
        staticClass: "f-baseX"
      }, [n("div", {
        staticClass: "switch-wrap f-baseX"
      }, t._l(t.switchval, function (e, a) {
        return n("div", {
          key: "cy-export" + a,
          staticClass: "f-center siwitch-context f-size12 cursor",
          class: t.switIndex == a ? "switchSelect" : "",
          on: {
            click: function (e) {
              return t.setExt(a);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0), n("div", {
        staticClass: "f-space"
      }), n("p", {
        staticClass: "f-size12 mr7"
      }, [t._v("品质")]), n("div", {
        staticClass: "relative"
      }, [t.switIndex == 0 ? n("baseInput", {
        staticClass: "switch-input",
        attrs: {
          dark: true,
          title: "品质1-100"
        },
        nativeOn: {
          "!blur": function (e) {
            return t.checkQuality();
          }
        },
        model: {
          value: t.set.cyExport.quality,
          callback: function (e) {
            t.$set(t.set.cyExport, "quality", e);
          },
          expression: "set.cyExport.quality"
        }
      }) : n("div", {
        staticClass: "png-div f-baseX",
        on: {
          click: t.switchOpen
        }
      }, [t._v(" " + t._s(t.switchInputContext[t.switchInputIndex]) + " "), n("baseSvg", {
        staticClass: "png-svg svg-10",
        attrs: {
          name: "#iconzhankaizhedie"
        },
        on: {
          handle: t.switchOpen
        }
      })], 1), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.switchInputOpen,
          expression: "switchInputOpen"
        }],
        staticClass: "switch-input-context"
      }, t._l(t.switchInputContext, function (e, a) {
        return n("div", {
          key: "cy-export2" + a,
          on: {
            click: function (n) {
              t.set.cyExport.png8 = e == "PNG-8";
              t.switchInputOpen = false;
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0)], 1)]), n("div", {
        staticClass: "f-arrayX theme-mt-row"
      }, [n("p", {
        staticClass: "f-size12 mr8 mt6"
      }, [t._v("保存到")]), n("div", {
        staticClass: "f-space"
      }, [n("baseInput", {
        staticClass: "  mb8",
        attrs: {
          dark: true,
          tips: "自定义目录",
          title: "选择自定义目录"
        },
        nativeOn: {
          "!blur": function (e) {
            return t.checkPath();
          }
        },
        model: {
          value: t.set.cyExport.path,
          callback: function (e) {
            t.$set(t.set.cyExport, "path", e);
          },
          expression: "set.cyExport.path"
        }
      }, [n("baseIcon", {
        attrs: {
          slot: "right",
          hover: "no",
          name: "#iconwenjianjiaguanli"
        },
        on: {
          handle: t.getPath
        },
        slot: "right"
      })], 1), n("div", {
        staticClass: "f-base"
      }, [n("baseRadio", {
        attrs: {
          label: 1,
          title: "保存到桌面"
        },
        model: {
          value: t.set.cyExport.pathType,
          callback: function (e) {
            t.$set(t.set.cyExport, "pathType", e);
          },
          expression: "set.cyExport.pathType"
        }
      }, [t._v(" 桌面 ")]), n("baseRadio", {
        staticClass: "ml30",
        attrs: {
          label: 2,
          title: "保存到文件所在目录"
        },
        model: {
          value: t.set.cyExport.pathType,
          callback: function (e) {
            t.$set(t.set.cyExport, "pathType", e);
          },
          expression: "set.cyExport.pathType"
        }
      }, [t._v(" 文件所在目录 ")])], 1)], 1)]), n("div", {
        staticClass: "f-arrayX theme-mt-row"
      }, [n("p", {
        staticClass: "f-size12 mr20 mt6"
      }, [t._v("命名")]), n("div", {
        staticClass: "f-space"
      }, [n("baseInput", {
        staticClass: " mb8",
        attrs: {
          dark: true,
          tips: "重命名"
        },
        model: {
          value: t.set.cyExport.name,
          callback: function (e) {
            t.$set(t.set.cyExport, "name", e);
          },
          expression: "set.cyExport.name"
        }
      }), n("div", {
        staticClass: "f-baseX "
      }, [n("baseCheck", {
        attrs: {
          title: "使用当前图层名字"
        },
        model: {
          value: t.set.cyExport.layerName,
          callback: function (e) {
            t.$set(t.set.cyExport, "layerName", e);
          },
          expression: "set.cyExport.layerName"
        }
      }, [t._v(" 图层名 ")]), n("baseCheck", {
        staticClass: "ml17",
        attrs: {
          title: "不覆盖原图，使用数字编号命名。不支持多个切片哦"
        },
        model: {
          value: t.set.cyExport.isNumber,
          callback: function (e) {
            t.$set(t.set.cyExport, "isNumber", e);
          },
          expression: "set.cyExport.isNumber"
        }
      }, [t._v(" 自动编号 ")])], 1)], 1)])]), n("hr", {
        staticClass: "line theme-mt-row"
      }), n("div", {
        staticClass: "app-padding"
      }, [n("baseRadio", {
        staticClass: "theme-mt-row",
        attrs: {
          label: 1,
          title: "注意：有切片的情况下导出一次后，再次设置品质和格式均无效，需要生成切片才生效哦"
        },
        model: {
          value: t.set.cyExport.saveType,
          callback: function (e) {
            t.$set(t.set.cyExport, "saveType", e);
          },
          expression: "set.cyExport.saveType"
        }
      }, [t._v(" 使用导出Web方式(可以切片) ")]), n("baseRadio", {
        staticClass: "theme-mt-row",
        attrs: {
          label: 2,
          title: "与ctrl+shift+s保存一样"
        },
        model: {
          value: t.set.cyExport.saveType,
          callback: function (e) {
            t.$set(t.set.cyExport, "saveType", e);
          },
          expression: "set.cyExport.saveType"
        }
      }, [t._v(" 使用另存为方式(不压缩) ")])], 1), n("hr", {
        staticClass: "line theme-mt-row"
      }), n("div", {
        staticClass: "mt10"
      }, [n("baseOpen", {
        staticClass: "app-padding",
        attrs: {
          text: "压缩尺寸 & 加水印"
        },
        model: {
          value: t.set.cyShowCompress,
          callback: function (e) {
            t.$set(t.set, "cyShowCompress", e);
          },
          expression: "set.cyShowCompress"
        }
      }, [n("div", {
        staticClass: "f-baseX mt10"
      }, [n("div", {
        staticClass: "f-space mr10"
      }, [n("baseInput", {
        staticClass: " theme-mb",
        attrs: {
          dark: true,
          tips: "导出宽度"
        },
        nativeOn: {
          "!blur": function (e) {
            return t.chenckUnit("width");
          }
        },
        model: {
          value: t.set.cyExport.compress.width,
          callback: function (e) {
            t.$set(t.set.cyExport.compress, "width", e);
          },
          expression: "set.cyExport.compress.width"
        }
      })], 1), n("div", {
        staticClass: "f-space"
      }, [n("baseInput", {
        staticClass: " mr0 theme-mb",
        attrs: {
          dark: true,
          tips: "导出高度"
        },
        nativeOn: {
          "!blur": function (e) {
            return t.chenckUnit("height");
          }
        },
        model: {
          value: t.set.cyExport.compress.height,
          callback: function (e) {
            t.$set(t.set.cyExport.compress, "height", e);
          },
          expression: "set.cyExport.compress.height"
        }
      })], 1)]), n("baseInput", {
        staticClass: " ",
        attrs: {
          dark: true,
          tips: "选择水印文件"
        },
        nativeOn: {
          "!blur": function (e) {
            return t.updataPath();
          }
        },
        model: {
          value: t.set.cyExport.compress.watermark,
          callback: function (e) {
            t.$set(t.set.cyExport.compress, "watermark", e);
          },
          expression: "set.cyExport.compress.watermark"
        }
      }, [n("baseIcon", {
        attrs: {
          slot: "right",
          hover: "no",
          name: "#iconwenjianjiaguanli"
        },
        on: {
          handle: t.getWatermarkPath
        },
        slot: "right"
      })], 1), n("baseCheck", {
        staticClass: "mt10",
        model: {
          value: t.set.cyExport.compress.exportOriginalGraph,
          callback: function (e) {
            t.$set(t.set.cyExport.compress, "exportOriginalGraph", e);
          },
          expression: "set.cyExport.compress.exportOriginalGraph"
        }
      }, [t._v(" 同时导出原图 ")])], 1), n("hr", {
        staticClass: "line theme-mt-row"
      }), n("baseOpen", {
        staticClass: "theme-mt-row app-padding",
        attrs: {
          text: "所在目录设置"
        },
        model: {
          value: t.set.cyShowSetFolder,
          callback: function (e) {
            t.$set(t.set, "cyShowSetFolder", e);
          },
          expression: "set.cyShowSetFolder"
        }
      }, [n("div", [n("button", {
        staticClass: "btn-1 mt10",
        on: {
          click: t.openFolder,
          contextmenu: function (e) {
            return t.fpOpenFolder();
          }
        }
      }, [t._v(" 打开所在目录 ")]), n("baseCheck", {
        model: {
          value: t.set.cyExport.autoOpenFolder,
          callback: function (e) {
            t.$set(t.set.cyExport, "autoOpenFolder", e);
          },
          expression: "set.cyExport.autoOpenFolder"
        }
      }, [t._v(" 保存后自动打开所在目录 ")])], 1)]), n("hr", {
        staticClass: "line theme-mt-row"
      }), n("baseOpen", {
        staticClass: "theme-mt-row app-padding",
        attrs: {
          text: "批量导出功能"
        },
        model: {
          value: t.set.cyShowBatch,
          callback: function (e) {
            t.$set(t.set, "cyShowBatch", e);
          },
          expression: "set.cyShowBatch"
        }
      }, [n("div", [n("button", {
        staticClass: "btn-2 mt10",
        on: {
          click: t.batchExportLayer,
          contextmenu: function (e) {
            return t.fpBatchExportLayer();
          }
        }
      }, [t._v(" 导出一级图层 ")]), n("button", {
        staticClass: "btn-2 mr0",
        on: {
          click: t.batchExportSecondLayer,
          contextmenu: function (e) {
            return t.fpBatchExportSecondLayer();
          }
        }
      }, [t._v(" 导出二级图层 ")]), n("button", {
        staticClass: "btn-1 mb0",
        on: {
          click: t.bacthExportPsdToImage,
          contextmenu: function (e) {
            return t.fpBacthExportPsdToImage();
          }
        }
      }, [t._v(" 批量导出文件夹所有PSD ")])])])], 1)]);
    }
```