# 模板 · Rename

> 来源：`56d7.js` render 函数 `XS`（行 49356）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<Myvuescroll class="Overprint h100 relative f-arrayY">
  <div class="top-switch f-baseX" />
  <Myvuescroll class="f-arrayY overprint-vueScroll">
    <div class="app-padding h100" v-show="switchindex == 0">
      <div class="h50 f-arrayY">
        <div class="list-top-text f-baseX mt10">
          <p class="f-size12 cursor f-space">
            文本类型
          </p>
          <baseIcon @handle />
        </div>
        <div class="table w100 mt7 ff1 f-arrayY">
          <tr class="w100 list-nav f-baseX f-alignNone">
            <td class="id borderRight">
              序号
            </td>
            <td class="variableName borderRight">
              变量名
            </td>
            <td class="layerName">
              图层名
            </td>
          </tr>
          <Myvuescroll class="list-context-wrap ff1" />
          <div class="no-add f-center ff1 f-baseY">
            <baseSvg class="Notadded" />
            <p>
              未添加变量
            </p>
          </div>
          <div class="paging-wrap f-center">
            <paging class="mt10 mb10 paging" v-model="textPagingIndex" />
          </div>
        </div>
      </div>
      <div class="h50 f-arrayY">
        <div class="list-top-text f-baseX mt13">
          <p class="f-size12 cursor f-space">
            图片类型
          </p>
          <baseIcon @handle />
        </div>
        <div class="table w100 mt7 ff1 f-arrayY mb20">
          <tr class="w100 list-nav f-baseX f-alignNone">
            <td class="id borderRight">
              序号
            </td>
            <td class="variableName borderRight">
              变量名
            </td>
            <td class="layerName">
              图层名
            </td>
          </tr>
          <Myvuescroll class="list-context-wrap ff1" />
          <div class="no-add f-center ff1 f-baseY">
            <baseSvg class="Notadded" />
            <p>
              未添加变量
            </p>
          </div>
          <div class="paging-wrap f-center">
            <paging class="mt10 mb10 paging" v-model="imgPagingIndex" />
          </div>
        </div>
      </div>
    </div>
    <div>
      <div class="f-baseX mt10 app-padding">
        <p class="secondary-info">
          暂无套版数据
        </p>
        <p class="secondary-info">
          共
        </p>
      </div>
      <div class="f-baseX mt10 app-padding">
        <div class="f-baseX f-space">
          <button class="mb0 btn-small-2" @click>
            导入数据
          </button>
          <button class="mb0 btn-small-2 mr0" @click>
            开始套版
          </button>
        </div>
      </div>
      <div class="f-center mt10 contextHover cursor">
        <baseSvg @handle />
        <p class="cursor" @click>
          下载数据模板
        </p>
      </div>
      <hr class="line mt15 mb15" />
      <div class="app-padding">
        <div class="f-baseX">
          <p class="left">
            保存到
          </p>
          <div class="f-space f-baseX">
            <baseRadio v-model="set.batch.savePath">
              桌面
            </baseRadio>
            <baseRadio class="ml30" v-model="set.batch.savePath">
              文件所在目录
            </baseRadio>
          </div>
        </div>
        <div class="f-baseX mt15">
          <p class="left">
            文件名
          </p>
          <div class="suffix-wrap f-space">
            <div class="suffix f-baseX" @click>
              <p />
              <div class="f-space" />
              <baseSvg class="open ml15 svg-10" @handle />
            </div>
            <dropDown class="suffix-dropDown" @dropchange />
          </div>
        </div>
        <div class="f-baseX">
          <div class="left" />
          <div class="f-space">
            <div class="f-baseX w100 mt10">
              <div class="beAfter inputComOpen mr5">
                <baseDropdownMenu @handle />
                <dropDown class="suffix-dropDown beAfter-dropDown" @dropchange />
              </div>
              <baseInput class="center inputComOpen mr5" v-model="set.batch.fileName.connector" />
              <baseInput class="beFront inputComOpen" v-model="set.batch.fileName.docName" />
            </div>
            <p class="mt8">
              输出：03511
            </p>
          </div>
        </div>
        <div class="f-baseX">
          <div class="left f-full" />
          <div class="f-space">
            <div class="f-baseX w100 mt10">
              <baseInput class="beFront inputComOpen mr5" v-model="set.batch.fileName.docName" />
              <baseInput class="center inputComOpen mr5" v-model="set.batch.fileName.connector" />
              <div class="beAfter inputComOpen">
                <baseDropdownMenu @handle />
                <dropDown class="suffix-dropDown beAfter-dropDown" @dropchange />
              </div>
            </div>
            <p class="mt8">
              输出：
            </p>
          </div>
        </div>
        <div class="f-baseX mt15">
          <p>
            图片匹配机制
          </p>
        </div>
        <div class="f-baseX mt5">
          <div class="left" />
          <div>
            <baseRadio v-model="set.batch.imageOption.matching">
              变量值匹配图片名称
            </baseRadio>
            <baseRadio class="mt5" v-model="set.batch.imageOption.matching">
              匹配变量序号
            </baseRadio>
          </div>
        </div>
        <p class="mt10">
          图片大小处理
        </p>
        <div class="f-baseX mt5">
          <div class="left" />
          <div>
            <baseRadio v-model="set.batch.imageOption.size">
              匹配替换图层大小
            </baseRadio>
            <baseRadio class="mt5" v-model="set.batch.imageOption.size">
              匹配替换图层背景框大小
            </baseRadio>
          </div>
        </div>
        <baseCheck class="mt15" v-model="set.batch.exportImage">
          导出图片(导出图片功能的设置)
        </baseCheck>
      </div>
    </div>
  </Myvuescroll>
  <add @close v-show="addIstrue" />
  <div />
</Myvuescroll>
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
  return n("Myvuescroll", {
    staticClass: "Overprint h100 relative f-arrayY",
    nativeOn: {
      contextmenu: function (e) {
        e.preventDefault();
        return t.showMenu(e);
      }
    }
  }, [n("div", {
    staticClass: "top-switch f-baseX"
  }, t._l(t.switchdata, function (e, a) {
    return n("div", {
      key: "overpringt" + a,
      staticClass: "switch-text f-center mr30 cursor",
      class: t.switchindex == a ? "switch-context-boder" : "",
      attrs: {
        title: e
      },
      on: {
        click: function (e) {
          t.switchindex = a;
        }
      }
    }, [t._v(" " + t._s(e) + " ")]);
  }), 0), n("Myvuescroll", {
    staticClass: "f-arrayY overprint-vueScroll"
  }, [n("div", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.switchindex == 0,
      expression: "switchindex == 0"
    }],
    staticClass: "app-padding h100"
  }, [n("div", {
    staticClass: "h50 f-arrayY"
  }, [n("div", {
    staticClass: "list-top-text f-baseX mt10"
  }, [n("p", {
    staticClass: "f-size12 cursor f-space"
  }, [t._v("文本类型")]), n("baseIcon", {
    attrs: {
      svgWidth: "16px",
      name: "#iconchuangjian",
      title: "添加文本图层变量"
    },
    on: {
      handle: function (e) {
        return t.addText();
      }
    }
  })], 1), n("div", {
    staticClass: "table w100 mt7 ff1 f-arrayY"
  }, [n("tr", {
    staticClass: "w100 list-nav f-baseX f-alignNone"
  }, [n("td", {
    staticClass: "id borderRight"
  }, [t._v("序号")]), n("td", {
    staticClass: "variableName borderRight"
  }, [t._v("变量名")]), n("td", {
    staticClass: "layerName"
  }, [t._v("图层名")])]), t.variable.texts.length != 0 ? n("Myvuescroll", {
    staticClass: "list-context-wrap ff1"
  }, t._l(t.variable.texts, function (e, a) {
    return n("tr", {
      directives: [{
        name: "show",
        rawName: "v-show",
        value: a >= (t.textPagingIndex - 1) * t.pageSize && a < (t.textPagingIndex - 1) * t.pageSize + t.pageSize,
        expression: "\n                                i >= (textPagingIndex - 1) * pageSize &&\n                                    i < (textPagingIndex - 1) * pageSize + pageSize\n                            "
      }],
      key: "overpringt1" + a,
      staticClass: "list-context f-baseX drag-overprintOne-wrap f-alignNone",
      class: t.tableOneIstrue == a ? "trclick" : "",
      on: {
        contextmenu: function (e) {
          e.preventDefault();
          e.stopPropagation();
          return t.showTextMenu(e, a, "texts");
        },
        mousedown: function (e) {
          return t.dragColorWrap(a, ".drag-overprintOne-wrap", ".overprint-vueScroll", "texts");
        },
        mousemove: function (e) {
          return t.dragColorWrapDrop(a);
        },
        click: function (e) {
          return t.selectTextTable(a);
        }
      }
    }, [n("td", {
      staticClass: "id "
    }, [t._v(t._s(a + 1))]), n("td", {
      staticClass: "variableName "
    }, [n("pre", [t._v(t._s(e.name))])]), n("td", {
      staticClass: "layerName "
    }, [n("pre", [t._v(t._s(e.layerName))])])]);
  }), 0) : t._e(), t.variable.texts.length == 0 ? n("div", {
    staticClass: "no-add f-center ff1 f-baseY"
  }, [n("baseSvg", {
    staticClass: "Notadded",
    attrs: {
      name: "#iconweitianjiabianliang"
    }
  }), n("p", [t._v("未添加变量")])], 1) : t._e(), t.variable.texts.length > t.pageSize ? n("div", {
    staticClass: "paging-wrap f-center"
  }, [n("paging", {
    staticClass: "mt10 mb10 paging",
    attrs: {
      total: t.variable.texts.length,
      pageSize: t.pageSize
    },
    model: {
      value: t.textPagingIndex,
      callback: function (e) {
        t.textPagingIndex = e;
      },
      expression: "textPagingIndex"
    }
  })], 1) : t._e()], 1)]), n("div", {
    staticClass: "h50 f-arrayY"
  }, [n("div", {
    staticClass: "list-top-text f-baseX mt13"
  }, [n("p", {
    staticClass: "f-size12 cursor f-space"
  }, [t._v("图片类型")]), n("baseIcon", {
    attrs: {
      svgWidth: "16px",
      name: "#iconchuangjian",
      title: "添加图片图层变量"
    },
    on: {
      handle: function (e) {
        return t.addImage();
      }
    }
  })], 1), n("div", {
    staticClass: "table w100 mt7 ff1 f-arrayY mb20"
  }, [n("tr", {
    staticClass: "w100 list-nav f-baseX f-alignNone"
  }, [n("td", {
    staticClass: "id borderRight"
  }, [t._v("序号")]), n("td", {
    staticClass: "variableName borderRight"
  }, [t._v("变量名")]), n("td", {
    staticClass: "layerName"
  }, [t._v("图层名")])]), t.variable.images.length != 0 ? n("Myvuescroll", {
    staticClass: "list-context-wrap ff1"
  }, t._l(t.variable.images, function (e, a) {
    return n("tr", {
      directives: [{
        name: "show",
        rawName: "v-show",
        value: a >= (t.imgPagingIndex - 1) * t.pageSize && a < (t.imgPagingIndex - 1) * t.pageSize + t.pageSize,
        expression: "\n                                i >= (imgPagingIndex - 1) * pageSize &&\n                                    i < (imgPagingIndex - 1) * pageSize + pageSize\n                            "
      }],
      key: "overpringt2" + a,
      staticClass: "list-context f-baseX drag-overprintTwo-wrap f-alignNone",
      class: t.tableTwoIstrue == a ? "trclick" : "",
      on: {
        contextmenu: function (e) {
          e.preventDefault();
          e.stopPropagation();
          return t.showTextMenu(e, a, "images");
        },
        mousedown: function (e) {
          return t.dragColorWrap(a, ".drag-overprintTwo-wrap", ".overprint-vueScroll", "images");
        },
        mousemove: function (e) {
          return t.dragColorWrapDrop(a);
        },
        click: function (e) {
          return t.selectImgaeTable(a);
        }
      }
    }, [n("td", {
      staticClass: "id "
    }, [t._v(t._s(a + 1))]), n("td", {
      staticClass: "variableName "
    }, [n("pre", [t._v(t._s(e.name))])]), n("td", {
      staticClass: "layerName"
    }, [n("pre", [t._v(t._s(e.layerName))])])]);
  }), 0) : t._e(), t.variable.images.length == 0 ? n("div", {
    staticClass: "no-add f-center ff1 f-baseY"
  }, [n("baseSvg", {
    staticClass: "Notadded",
    attrs: {
      name: "#iconweitianjiabianliang"
    }
  }), n("p", [t._v("未添加变量")])], 1) : t._e(), t.variable.images.length > t.pageSize ? n("div", {
    staticClass: "paging-wrap f-center"
  }, [n("paging", {
    staticClass: "mt10 mb10 paging",
    attrs: {
      total: t.variable.images.length,
      pageSize: t.pageSize
    },
    model: {
      value: t.imgPagingIndex,
      callback: function (e) {
        t.imgPagingIndex = e;
      },
      expression: "imgPagingIndex"
    }
  })], 1) : t._e()], 1)])]), n("div", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.switchindex != 0,
      expression: "switchindex != 0"
    }]
  }, [n("div", {
    staticClass: "f-baseX mt10 app-padding"
  }, [t.batchData.length == 0 ? n("p", {
    staticClass: "secondary-info"
  }, [t._v("暂无套版数据")]) : n("p", {
    staticClass: "secondary-info"
  }, [t._v("共" + t._s(t.batchData.length) + "条数据")])]), n("div", {
    staticClass: "f-baseX mt10 app-padding"
  }, [n("div", {
    staticClass: "f-baseX f-space"
  }, [n("button", {
    staticClass: "mb0 btn-small-2",
    attrs: {
      title: "导入套版数据"
    },
    on: {
      click: function (e) {
        t.addIstrue = !t.addIstrue;
      }
    }
  }, [t._v(" 导入数据 ")]), n("button", {
    staticClass: "mb0 btn-small-2 mr0",
    class: [t.status ? "theme-btn" : "disable-btn"],
    attrs: {
      title: "应用批量套版"
    },
    on: {
      click: function (e) {
        return t.handleBatch();
      }
    }
  }, [t._v(" 开始套版 ")])])]), n("div", {
    staticClass: "f-center mt10 contextHover cursor",
    attrs: {
      title: "下载示例模板表格"
    }
  }, [n("baseSvg", {
    attrs: {
      name: "#icondaoru"
    },
    on: {
      handle: function (e) {
        return t.downTempFile();
      }
    }
  }), n("p", {
    staticClass: "cursor",
    on: {
      click: function (e) {
        return t.downTempFile();
      }
    }
  }, [t._v("下载数据模板")])], 1), n("hr", {
    staticClass: "line mt15 mb15"
  }), n("div", {
    staticClass: "app-padding"
  }, [n("div", {
    staticClass: "f-baseX"
  }, [n("p", {
    staticClass: "left",
    attrs: {
      title: "套版文件存储的路径"
    }
  }, [t._v("保存到")]), n("div", {
    staticClass: "f-space f-baseX"
  }, [n("baseRadio", {
    attrs: {
      label: 1,
      title: "保存到电脑桌面"
    },
    model: {
      value: t.set.batch.savePath,
      callback: function (e) {
        t.$set(t.set.batch, "savePath", e);
      },
      expression: "set.batch.savePath"
    }
  }, [t._v(" 桌面 ")]), n("baseRadio", {
    staticClass: "ml30",
    attrs: {
      label: 2,
      title: "保存到psd所在目录"
    },
    model: {
      value: t.set.batch.savePath,
      callback: function (e) {
        t.$set(t.set.batch, "savePath", e);
      },
      expression: "set.batch.savePath"
    }
  }, [t._v(" 文件所在目录 ")])], 1)]), n("div", {
    staticClass: "f-baseX mt15"
  }, [n("p", {
    staticClass: "left",
    attrs: {
      title: "文件名的存储方式"
    }
  }, [t._v("文件名")]), n("div", {
    staticClass: "suffix-wrap f-space"
  }, [n("div", {
    staticClass: "suffix f-baseX",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.dropOpen("sufSub");
      }
    }
  }, [n("p", [t._v(t._s(t.set.batch.fileName.type == 1 ? "加前缀" : "加后缀"))]), n("div", {
    staticClass: "f-space"
  }), n("baseSvg", {
    staticClass: "open ml15 svg-10",
    class: t.suffixDropDownIstrue ? "rotate0" : "rotate-90",
    attrs: {
      name: "#iconzhankaizhedie"
    },
    on: {
      handle: function (e) {
        return t.dropOpen("sufSub");
      }
    }
  })], 1), n("dropDown", {
    ref: "sufSub",
    staticClass: "suffix-dropDown",
    attrs: {
      firstSvg: "#icongouxuan",
      text: t.suffixDropDown
    },
    on: {
      dropchange: t.changesuffi
    }
  })], 1)]), t.set.batch.fileName.type == 1 ? n("div", {
    staticClass: "f-baseX"
  }, [n("div", {
    staticClass: "left"
  }), n("div", {
    staticClass: "f-space"
  }, [n("div", {
    staticClass: "f-baseX w100 mt10"
  }, [n("div", {
    staticClass: "beAfter inputComOpen mr5",
    attrs: {
      title: "变量的值作为前缀1"
    }
  }, [n("baseDropdownMenu", {
    attrs: {
      text: t.beAfterData
    },
    on: {
      handle: function (e) {
        return t.dropOpen("suf");
      }
    }
  }), n("dropDown", {
    ref: "suf",
    staticClass: "suffix-dropDown beAfter-dropDown",
    attrs: {
      text: t.variableList,
      textClass: "f-center"
    },
    on: {
      dropchange: t.changeVarList
    }
  })], 1), n("baseInput", {
    staticClass: "center inputComOpen mr5",
    attrs: {
      size: "small",
      title: "文件名连接符，可以为空"
    },
    model: {
      value: t.set.batch.fileName.connector,
      callback: function (e) {
        t.$set(t.set.batch.fileName, "connector", e);
      },
      expression: "set.batch.fileName.connector"
    }
  }), n("baseInput", {
    staticClass: "beFront inputComOpen",
    attrs: {
      size: "small",
      title: "[文档名]对应psd的名称，可以自定义其他名字1"
    },
    model: {
      value: t.set.batch.fileName.docName,
      callback: function (e) {
        t.$set(t.set.batch.fileName, "docName", e);
      },
      expression: "set.batch.fileName.docName"
    }
  })], 1), n("p", {
    staticClass: "mt8"
  }, [t._v(" 输出：03511" + t._s(t.set.batch.fileName.connector) + t._s(t.set.batch.fileName.docName) + ".psd ")])])]) : n("div", {
    staticClass: "f-baseX"
  }, [n("div", {
    staticClass: "left f-full"
  }), n("div", {
    staticClass: "f-space"
  }, [n("div", {
    staticClass: "f-baseX w100 mt10"
  }, [n("baseInput", {
    staticClass: "beFront inputComOpen mr5",
    attrs: {
      size: "small",
      title: "[文档名]对应psd的名称，可以自定义其他名字"
    },
    model: {
      value: t.set.batch.fileName.docName,
      callback: function (e) {
        t.$set(t.set.batch.fileName, "docName", e);
      },
      expression: "set.batch.fileName.docName"
    }
  }), n("baseInput", {
    staticClass: "center inputComOpen mr5",
    attrs: {
      size: "small",
      title: "文件名连接符，可以为空"
    },
    model: {
      value: t.set.batch.fileName.connector,
      callback: function (e) {
        t.$set(t.set.batch.fileName, "connector", e);
      },
      expression: "set.batch.fileName.connector"
    }
  }), n("div", {
    staticClass: "beAfter inputComOpen",
    attrs: {
      title: "变量的值作为前缀"
    }
  }, [n("baseDropdownMenu", {
    attrs: {
      text: t.beAfterData
    },
    on: {
      handle: function (e) {
        return t.dropOpen("sub");
      }
    }
  }), n("dropDown", {
    ref: "sub",
    staticClass: "suffix-dropDown beAfter-dropDown",
    attrs: {
      text: t.variableList,
      textClass: "f-center"
    },
    on: {
      dropchange: t.changeVarList
    }
  })], 1)], 1), n("p", {
    staticClass: "mt8"
  }, [t._v(" 输出：" + t._s(t.set.batch.fileName.docName) + t._s(t.set.batch.fileName.connector) + "03511.psd ")])])]), n("div", {
    staticClass: "f-baseX mt15"
  }, [n("p", {
    attrs: {
      title: "图片名称机制"
    }
  }, [t._v("图片匹配机制")])]), n("div", {
    staticClass: "f-baseX mt5"
  }, [n("div", {
    staticClass: "left"
  }), n("div", [n("baseRadio", {
    attrs: {
      label: 1,
      title: "按照表格填写的名字匹配"
    },
    model: {
      value: t.set.batch.imageOption.matching,
      callback: function (e) {
        t.$set(t.set.batch.imageOption, "matching", e);
      },
      expression: "set.batch.imageOption.matching"
    }
  }, [t._v(" 变量值匹配图片名称 ")]), n("baseRadio", {
    staticClass: "mt5",
    attrs: {
      label: 2,
      title: "根据变量设置里的排序匹配"
    },
    model: {
      value: t.set.batch.imageOption.matching,
      callback: function (e) {
        t.$set(t.set.batch.imageOption, "matching", e);
      },
      expression: "set.batch.imageOption.matching"
    }
  }, [t._v(" 匹配变量序号 ")])], 1)]), n("p", {
    staticClass: "mt10",
    attrs: {
      title: "图片替换后大小的处理"
    }
  }, [t._v("图片大小处理")]), n("div", {
    staticClass: "f-baseX mt5"
  }, [n("div", {
    staticClass: "left"
  }), n("div", [n("baseRadio", {
    attrs: {
      label: 1,
      title: "根据替换的图层大小"
    },
    model: {
      value: t.set.batch.imageOption.size,
      callback: function (e) {
        t.$set(t.set.batch.imageOption, "size", e);
      },
      expression: "set.batch.imageOption.size"
    }
  }, [t._v(" 匹配替换图层大小 ")]), n("baseRadio", {
    staticClass: "mt5",
    attrs: {
      label: 2,
      title: "匹配替换的图层下方的背景框大小"
    },
    model: {
      value: t.set.batch.imageOption.size,
      callback: function (e) {
        t.$set(t.set.batch.imageOption, "size", e);
      },
      expression: "set.batch.imageOption.size"
    }
  }, [t._v(" 匹配替换图层背景框大小 ")])], 1)]), n("baseCheck", {
    staticClass: "mt15",
    attrs: {
      title: "导出图片格式将按照‘常用功能-导出图片’的设置导出"
    },
    model: {
      value: t.set.batch.exportImage,
      callback: function (e) {
        t.$set(t.set.batch, "exportImage", e);
      },
      expression: "set.batch.exportImage"
    }
  }, [t._v(" 导出图片(导出图片功能的设置) ")])], 1)])]), n("add", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.addIstrue,
      expression: "addIstrue"
    }],
    on: {
      close: t.close,
      analysis: t.analysisData
    }
  }), n("div", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: false,
      expression: "false"
    }]
  }, [t._v(t._s((t.countPosition[0], t.countPosition[1])))])], 1);
}
```