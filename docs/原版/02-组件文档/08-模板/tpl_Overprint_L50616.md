# 模板 · Overprint

> 来源：`56d7.js` 的 render 函数 `sO`（行 50616）
> 节点数：4

## 伪 JSX 结构

```jsx
<filterVarSelectRef class="f-baseX" @dropchange="..."></filterVarSelectRef>
<selectExportFileTypeRef class="select_icon" @dropchange="..."></selectExportFileTypeRef>
<selectUrlRef class="select_icon"></selectUrlRef>
<setNameRef class="select_icon" @dropchange="..."></setNameRef>
```

## 节点明细

| 标签 | class | 文本 | 事件 |
|---|---|---|---|
| `filterVarSelectRef` | `f-baseX` | - | `dropchange` |
| `selectExportFileTypeRef` | `select_icon` | - | `dropchange` |
| `selectUrlRef` | `select_icon` | - | - |
| `setNameRef` | `select_icon` | - | `dropchange` |

## render 源码

```js
{
  var t = this;
  var e = t.$createElement;
  var a = t._self._c || e;
  return a("Myvuescroll", {
    staticClass: "Overprint h100 relative f-arrayY"
  }, [a("div", {
    staticClass: "top-switch f-baseX"
  }, t._l(t.switchdata, function (e, n) {
    return a("div", {
      key: "overpringt" + n,
      staticClass: "f-center switch-text cursor",
      class: {
        "switch-context-boder": t.switchindex >= n,
        active_switch: t.switchindex == n,
        disable_switch: t.switchindex < n
      },
      on: {
        click: function (e) {
          return t.handleClickSwitch(n);
        }
      }
    }, [a("div", {
      staticClass: "switch_index",
      class: {
        active_switch_index: t.switchindex === n
      },
      on: {
        mouseover: function (a) {
          return t.mouseOverSwitchIndex(e, n);
        },
        mouseleave: function (n) {
          return t.mouseLeaveSwitchIndex(e);
        }
      }
    }, [t._v(" " + t._s(n + 1) + " ")]), a("span", {
      directives: [{
        name: "show",
        rawName: "v-show",
        value: e.isShow || t.switchindex === n,
        expression: "site.isShow || switchindex === i"
      }]
    }, [t._v(t._s(e.label))])]);
  }), 0), a("Myvuescroll", {
    staticClass: "f-arrayY overprint-vueScroll"
  }, [a("div", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.switchindex == 0,
      expression: "switchindex == 0"
    }],
    staticClass: "app-padding h100 set_variable",
    on: {
      contextmenu: function (e) {
        e.preventDefault();
        return t.showMenu(e);
      }
    }
  }, [a("div", {
    staticClass: "f-arrayY"
  }, [a("div", {
    staticClass: "list-top-text f-baseX mt10 mb8"
  }, [a("div", {
    staticClass: "f-size12 set_var_btn",
    on: {
      click: function (e) {
        return t.handleAutoGetVariable();
      }
    }
  }, [a("span", [t._v("智能识别变量")]), a("div", {
    staticClass: "hover_tips",
    on: {
      click: function (t) {
        t.stopPropagation();
      }
    }
  }, [t._v("请先给图层命名")])]), a("div", {
    staticClass: "f-size12 set_var_btn add_var",
    on: {
      click: function (e) {
        return t.handleAddVar();
      }
    }
  }, [a("span", [t._v("手动添加变量")]), a("div", {
    staticClass: "hover_tips",
    on: {
      click: function (t) {
        t.stopPropagation();
      }
    }
  }, [t._v("请先选中图层")])]), a("div", {
    staticClass: "tip_box ml5"
  }, [a("GTooltip", {
    attrs: {
      overlayClassName: "standard_test_tip",
      placement: "bottomRight"
    },
    scopedSlots: t._u([{
      key: "title",
      fn: function () {
        return [a("div", {
          staticStyle: {
            color: "#fff"
          }
        }, [t._v(" 仅支持没有锁定的文本、图片、普通、智能对象图层设置变量 ")])];
      },
      proxy: true
    }])
  }, [a("GIcon", {
    staticStyle: {
      "font-size": "17px"
    },
    attrs: {
      type: "info-circle"
    }
  })], 1)], 1)]), a("SetVariableList", {
    attrs: {
      isInPopup: false,
      varibleValues: t.recordVaribleValues,
      variableList: t.confirmSelectedLarerVaribleList
    },
    on: {
      showTextMenu: t.showTextMenu
    }
  })], 1), a("div", {
    staticClass: "f-size12 next_set_overprint_prod",
    class: {
      disable_next_step: !t.confirmSelectedLarerVaribleList.length
    },
    on: {
      click: function (e) {
        return t.nextStep();
      }
    }
  }, [t._v(" 下一步 ")]), a("Popup", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.showAutoGetVariablePopup,
      expression: "showAutoGetVariablePopup"
    }],
    staticClass: "set_var_list_pop"
  }, [a("div", {
    staticClass: "show_autoget_variable_list"
  }, [a("div", {
    staticClass: "select_tem_text"
  }, [a("span", {
    staticClass: "popup_title"
  }, [t._v("选择您的套版变量")]), a("div", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.isShowFilterSelect,
      expression: "isShowFilterSelect"
    }],
    staticClass: "suffix",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.dropOpen("filterVarSelectRef");
      }
    }
  }, [a("div", {
    staticClass: "f-baseX"
  }, [a("span", [t._v(t._s(t.showActiveTypeFilterValue))]), a("img", {
    staticClass: "select_icon",
    class: {
      select_icon_180: t.getCurrentDropdownIsShow("filterVarSelectRef")
    },
    attrs: {
      src: require("./41d8.js"),
      alt: ""
    }
  })]), a("dropDown", {
    ref: "filterVarSelectRef",
    staticClass: "suffix-dropDown",
    attrs: {
      text: t.filterVarTypes,
      selectIndex: 0,
      firstSvg: "#icongouxuan"
    },
    on: {
      dropchange: t.selectFilterVarTypeChange
    }
  })], 1)]), a("div", {
    staticClass: "var_list_box"
  }, [a("SetVariableList", {
    ref: "setVarListRef",
    attrs: {
      confirmSelectedLarerVaribleList: t.confirmSelectedLarerVaribleList,
      isInPopup: true,
      varibleValues: t.recordVaribleValues,
      variableList: t.showLayerVariableListInPopup
    }
  })], 1), a("div", {
    staticClass: "overflow-text default_var_name"
  }, [t._v(" *默认名称:变量01,变量02,变量03... ")]), a("div", {
    staticClass: "btn_box"
  }, [a("div", {
    on: {
      click: function (e) {
        return t.cancelSelectLayerVariblePoPup();
      }
    }
  }, [t._v("取消")]), a("div", {
    staticClass: "confirm_set_var",
    on: {
      click: function (e) {
        return t.confirmSelectLayerVariblePopup();
      }
    }
  }, [t._v(" 确定 ")])])])])], 1), a("div", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.switchindex == 1,
      expression: "switchindex == 1"
    }],
    staticClass: "h100"
  }, [a("SetOverprintList", {
    ref: "setProductRef",
    attrs: {
      layerVaribleList: t.confirmSelectedLarerVaribleList,
      varibleValues: t.recordVaribleValues
    },
    on: {
      preStep: t.preStep,
      nextStep: t.nextStep
    }
  })], 1), a("div", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: t.switchindex == 2,
      expression: "switchindex == 2"
    }],
    staticClass: "step3_switch app-padding"
  }, [a("div", {
    staticClass: "total_bar"
  }, [a("img", {
    attrs: {
      src: require("./6adf.js"),
      alt: ""
    }
  }), a("div", {
    staticClass: "overflow-text total_group"
  }, [t._v(" " + t._s("本次套版共" + t.productList.length + "组") + " ")]), a("div", {
    staticClass: "overflow-text total_every_group"
  }, [a("span", [t._v(" " + t._s("每组替换文本" + t.confirmSelectedLarerVaribleList.filter(function (e) {
    return e.type == t.textVariableType;
  }).length + "个，") + " ")]), a("span", [t._v(" " + t._s("图像" + t.confirmSelectedLarerVaribleList.filter(function (e) {
    return e.type == t.imageVariableType;
  }).length + "个") + " ")])])]), a("div", {
    staticClass: "left_right_layout"
  }, [a("div", {
    staticClass: "label"
  }, [t._v("导出格式")]), a("div", {
    staticClass: "content"
  }, [a("div", {
    staticClass: "export_format_select f-arrayX"
  }, [a("check", {
    staticClass: "mt5 redioHoverContext",
    model: {
      value: t.set.batch.exportImage,
      callback: function (e) {
        t.$set(t.set.batch, "exportImage", e);
      },
      expression: "set.batch.exportImage"
    }
  }), a("div", {
    staticClass: "f-baseX ff1 suffix",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.dropOpen("selectExportFileTypeRef");
      }
    }
  }, [a("span", [t._v(t._s(t.exportFileTypeValue))]), a("img", {
    staticClass: "select_icon",
    class: {
      select_icon_180: t.getCurrentDropdownIsShow("selectExportFileTypeRef")
    },
    attrs: {
      src: require("./41d8.js"),
      alt: ""
    }
  })]), a("dropDown", {
    ref: "selectExportFileTypeRef",
    staticClass: "suffix-dropDown",
    attrs: {
      text: t.exportFileTypes,
      selectIndex: 0,
      firstSvg: "#icongouxuan"
    },
    on: {
      dropchange: t.selectExportFileTypeChange
    }
  })], 1), a("div", [a("check", {
    staticClass: "mt8 redioHoverContext",
    model: {
      value: t.set.batch.isExportPsd,
      callback: function (e) {
        t.$set(t.set.batch, "isExportPsd", e);
      },
      expression: "set.batch.isExportPsd"
    }
  }, [a("p", {
    attrs: {
      title: ""
    }
  }, [t._v("是否导出PSD")])])], 1)])]), a("div", {
    staticClass: "mt15 left_right_layout"
  }, [a("div", {
    staticClass: "label"
  }, [t._v("路径选择")]), a("div", {
    staticClass: "content"
  }, [a("div", {
    staticClass: "export_format_select"
  }, [a("div", {
    staticClass: "f-baseX suffix",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.dropOpen("selectUrlRef");
      }
    }
  }, [a("span", [t._v(t._s(t.selectPathTypes[t.selectPathTypeValue].label))]), a("img", {
    staticClass: "select_icon",
    class: {
      select_icon_180: t.getCurrentDropdownIsShow("selectUrlRef")
    },
    attrs: {
      src: require("./41d8.js"),
      alt: ""
    }
  })]), a("dropDown", {
    ref: "selectUrlRef",
    staticClass: "suffix-dropDown",
    attrs: {
      text: t.selectPathTypes.map(function (t) {
        return t.label;
      }),
      selectIndex: 0,
      firstSvg: "#icongouxuan"
    },
    on: {
      dropchange: t.selectPathTypesChange
    }
  })], 1)])]), a("div", {
    staticClass: "mt15 left_right_layout"
  }, [a("div", {
    staticClass: "label"
  }, [t._v("图片替换")]), a("div", {
    staticClass: "content"
  }, [a("div", {
    staticClass: "radio_box"
  }, [a("baseRadio", {
    staticClass: "mr15",
    attrs: {
      label: 2
    },
    model: {
      value: t.selectImgReplaceType,
      callback: function (e) {
        t.selectImgReplaceType = e;
      },
      expression: "selectImgReplaceType"
    }
  }, [t._v(" 剪贴蒙版 ")]), a("baseRadio", {
    attrs: {
      label: 1
    },
    model: {
      value: t.selectImgReplaceType,
      callback: function (e) {
        t.selectImgReplaceType = e;
      },
      expression: "selectImgReplaceType"
    }
  }, [t._v(" 图层替换 ")])], 1)])]), a("div", {
    staticClass: "mt15 set_name"
  }, [a("div", {
    staticClass: "set_name_text"
  }, [t._v("命名方式")]), a("div", {
    staticClass: "content"
  }, [a("input", {
    directives: [{
      name: "model",
      rawName: "v-model",
      value: t.setNameValue,
      expression: "setNameValue"
    }],
    attrs: {
      placeholder: t.setNameInputPlaceHold,
      type: "text"
    },
    domProps: {
      value: t.setNameValue
    },
    on: {
      input: function (e) {
        if (!e.target.composing) {
          t.setNameValue = e.target.value;
        }
      }
    }
  }), a("div", {
    staticClass: "set_name_select"
  }, [a("div", {
    staticClass: "overflow-text setname_suffix",
    on: {
      click: function (e) {
        e.stopPropagation();
        return t.dropOpen("setNameRef");
      }
    }
  }, [a("span", [t._v(t._s(t.suffixDropDown[t.setNameSelectValue].label))]), a("img", {
    staticClass: "select_icon",
    class: {
      select_icon_180: t.getCurrentDropdownIsShow("setNameRef")
    },
    attrs: {
      src: require("./41d8.js"),
      alt: ""
    }
  })]), a("dropDown", {
    ref: "setNameRef",
    staticClass: "suffix-dropDown",
    attrs: {
      text: t.suffixDropDown.map(function (t) {
        return t.label;
      }),
      selectIndex: 0,
      firstSvg: "#icongouxuan"
    },
    on: {
      dropchange: t.selectSetNameSuffixChange
    }
  })], 1)]), a("div", {
    staticClass: "result_name"
  }, [a("span", [t._v("文件名：")]), a("span", [t._v(t._s(t.getFileShowName()))])])]), a("div", {
    staticClass: "step_box"
  }, [a("div", {
    staticClass: "step_btn pre_step",
    on: {
      click: function (e) {
        return t.preStep();
      }
    }
  }, [t._v("上一步")]), a("div", {
    staticClass: "step_btn",
    on: {
      click: function (e) {
        return t.handleBatch();
      }
    }
  }, [t._v("批量套版")])])])]), a("div", {
    directives: [{
      name: "show",
      rawName: "v-show",
      value: false,
      expression: "false"
    }]
  }, [t._v(t._s((t.countPosition[0], t.countPosition[1])))])], 1);
}
```