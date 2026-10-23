# 模板 · anon_app.v4_L41521

> 来源：`app.v4.js` render 函数 `pv`（行 40385）
> 结构：**带层级**，缩进表示嵌套

## 结构树

```jsx
<div>
  <div class="app-padding mt10">
    <div class="square-input-wrap">
      <baseInputMore class="guide-four-replace" @handle v-model="fontInfo.family" />
      <squarecom class="squarecom" @changeFont v-model="fontInfo.family" />
    </div>
  </div>
  <div class="app-padding">
    <div class="f-baseX mt10">
      <div class="f-space ExtraLight-wrap">
        <baseDropdownMenu @handle />
        <dropDowncom class="ExtraLight-dropDown zindex99" @dropchange />
      </div>
      <p class="ml20 f-full">
        颜色：
      </p>
      <div class="color-preview ml1 cursor f-full" @click />
    </div>
    <div class="f-baseX mt10 f-alignNone">
      <div class="hover cursor div-vision" @click>
        视觉
      </div>
      <baseIcon @handle />
      <baseIcon @handle />
      <baseIcon @handle />
      <div class="verline" />
      <baseIcon @handle />
    </div>
  </div>
  <div>
    <div class="bottom-line f-baseX mt10 app-padding">
      <div class="f-baseX">
        <baseInputMore class="input-setFont f-space" @menu v-model="fontInfo.size">
          <baseSvg class="cursorw svg-16 ml4" />
        </baseInputMore>
      </div>
      <div class="ml6 f-space f-baseX f-alignNone" />
    </div>
    <div class="fontSpacing theme-mt" v-show="set.ztExpandMultiple ? fontSpacingIstrueArr[0] : fontSpacingIstrue == 0" />
    <div class="f-baseX mt10 app-padding">
      <div class="f-baseX">
        <baseInputMore class="input-setFont f-space" @menu v-model="leadingVal">
          <baseSvg class="cursorw svg-16 ml4" />
        </baseInputMore>
      </div>
      <div class="ml6 f-space f-baseX f-alignNone" />
    </div>
    <div class="fontSpacing theme-mt" v-show="set.ztExpandMultiple ? fontSpacingIstrueArr[1] : fontSpacingIstrue == 1" />
    <div class="app-padding ">
      <div class="f-baseX mt10">
        <div class="f-baseX">
          <baseInputMore class="input-setFont  ff1" @handle v-model="fontInfo.tracking">
            <baseSvg class="cursorw svg-16 ml4" />
          </baseInputMore>
        </div>
        <div class="ml6 f-space f-baseX f-alignNone" />
      </div>
    </div>
    <div class="fontSpacing theme-mt" v-show="set.ztExpandMultiple ? fontSpacingIstrueArr[2] : fontSpacingIstrue == 2" />
  </div>
  <div>
    <div class="f-baseX mt10 app-padding">
      <div class="ff1 f-baseX">
        <baseSvg class="cursorw svg-20" />
        <baseInputMore class="ml6 f-space" @menu v-model="fontInfo.size" />
      </div>
      <div class="setNbsp" />
      <div class="ff1 f-baseX">
        <baseSvg class="cursorw svg-22" />
        <baseInputMore class="ml6 f-space" @menu v-model="leadingVal" />
      </div>
    </div>
    <div class="fontSpacing theme-mt" v-show="set.ztExpandMultiple ? fontSpacingIstrueArr[0] : fontSpacingIstrue == 0" />
    <div class="fontSpacing theme-mt" v-show="set.ztExpandMultiple ? fontSpacingIstrueArr[1] : fontSpacingIstrue == 1" />
    <div class="app-padding">
      <div class="f-baseX mt10">
        <div class="ff1 f-baseX">
          <baseSvg class="cursorw svg-20" />
          <baseInputMore class="ml6 ff1" @handle v-model="fontInfo.tracking" />
        </div>
        <div class="setNbsp" />
        <div class="ff1 f-baseX">
          <baseCheck @change v-model="isOpticalKern">
            文字视觉调整
          </baseCheck>
        </div>
      </div>
    </div>
    <div class="fontSpacing theme-mt" v-show="set.ztExpandMultiple ? fontSpacingIstrueArr[2] : fontSpacingIstrue == 2" />
  </div>
</div>
```

## 动态渲染（需人工对照）

| 类型 | 处数 | 对应 |
|---|---|---|
| `_l()` 列表渲染 | 10 | `v-for` |
| `if` 条件分支 | 6 | `v-if` / `v-else` |

> 这些在 render 函数里是**控制流**，不是节点属性，无法自动转成 `v-if` / `v-for`。
> 重写时看下面的 render 源码，按 `_l(数组, function(item){...})` 还原列表，按 `if (条件) { return ... }` 还原条件。

## render 源码

```js
{
      var t = this;
      var e = t.$createElement;
      var n = t._self._c || e;
      return n("div", [n("div", {
        staticClass: "app-padding mt10"
      }, [n("div", {
        staticClass: "square-input-wrap"
      }, [n("baseInputMore", {
        staticClass: "guide-four-replace",
        attrs: {
          title: "搜索和选择字体"
        },
        on: {
          handle: function (e) {
            return t.dropOpen("squarecom");
          }
        },
        nativeOn: {
          click: function (e) {
            e.stopPropagation();
            return t.dropOpen("squarecom");
          }
        },
        model: {
          value: t.fontInfo.family,
          callback: function (e) {
            t.$set(t.fontInfo, "family", e);
          },
          expression: "fontInfo.family"
        }
      }), n("squarecom", {
        ref: "squarecom",
        staticClass: "squarecom",
        attrs: {
          findText: t.fontInfo.family
        },
        on: {
          changeFont: function (e) {
            return t.setFontFamily(e);
          }
        },
        model: {
          value: t.fontInfo.family,
          callback: function (e) {
            t.$set(t.fontInfo, "family", e);
          },
          expression: "fontInfo.family"
        }
      })], 1)]), n("div", {
        staticClass: "app-padding"
      }, [n("div", {
        staticClass: "f-baseX mt10"
      }, [n("div", {
        staticClass: "f-space ExtraLight-wrap",
        attrs: {
          title: "设置字体样式"
        }
      }, [n("baseDropdownMenu", {
        attrs: {
          text: t.fontInfo.weight
        },
        on: {
          handle: function (e) {
            return t.dropOpen("ExtraLightIstrue");
          }
        }
      }), n("dropDowncom", {
        ref: "ExtraLightIstrue",
        staticClass: "ExtraLight-dropDown zindex99",
        attrs: {
          text: t.setFontInfo.zz,
          firstSvg: "#icongouxuan",
          selectIndex: t.weightIndex
        },
        on: {
          dropchange: t.ExtraLightFun
        }
      })], 1), n("p", {
        staticClass: "ml20 f-full",
        attrs: {
          title: "颜色"
        }
      }, [t._v("颜色：")]), n("div", {
        staticClass: "color-preview ml1 cursor f-full",
        style: t.fontColor,
        attrs: {
          title: "设置颜色"
        },
        on: {
          click: function (e) {
            return t.setFontColor();
          }
        }
      })]), n("div", {
        staticClass: "f-baseX mt10 f-alignNone"
      }, [t.set.ztOldVersion ? n("div", {
        staticClass: "hover cursor div-vision",
        class: t.fontInfo.autoKerning == "opticalKern" ? "mysvgClick" : "",
        attrs: {
          svgClass: "svg-24",
          name: "#iconshijue",
          title: "设置两个字符间的字距为视觉"
        },
        on: {
          click: function (e) {
            return t.setAutoKerning();
          }
        }
      }, [t._v(" 视觉 ")]) : t._e(), n("baseIcon", {
        attrs: {
          name: "#iconzihaodaxiao7",
          svgWidth: "20px",
          title: "加粗",
          select: t.fontInfo.fauxBold
        },
        on: {
          handle: function (e) {
            return t.setFauxBold();
          }
        }
      }), n("baseIcon", {
        attrs: {
          name: "#iconqingxie",
          svgWidth: "20px",
          title: "倾斜",
          select: t.fontInfo.fauxItalic
        },
        on: {
          handle: function (e) {
            return t.setFauxItalic();
          }
        }
      }), n("baseIcon", {
        attrs: {
          name: "#iconquanbudaxie",
          svgWidth: "20px",
          title: "全部大写",
          select: t.fontInfo.capitalization == "allCaps"
        },
        on: {
          handle: function (e) {
            return t.setCapitalization();
          }
        }
      }), n("div", {
        staticClass: "verline"
      }), t._l(t.colorSvgTwo, function (e, a) {
        return n("baseIcon", {
          key: e + a,
          attrs: {
            svgWidth: "20px",
            select: t.alginIndex == a,
            name: e,
            title: t.svgTwoTitle[a] + "对齐文本，ctrl+点击设置段落对齐，shift+点击设置点文本"
          },
          on: {
            handle: function (e) {
              return t.setAlign(a);
            }
          }
        });
      })], 2)]), t.set.ztOldVersion ? n("div", [n("div", {
        staticClass: "bottom-line f-baseX mt10 app-padding"
      }, [n("div", {
        staticClass: "f-baseX",
        attrs: {
          title: "设置字体大小"
        }
      }, [n("baseInputMore", {
        ref: "refFontSize",
        staticClass: "input-setFont f-space",
        attrs: {
          size: "small"
        },
        on: {
          menu: t.fontSpacingOneFun,
          handle: t.fontSpacingOneFun
        },
        nativeOn: {
          contextmenu: function (e) {
            e.preventDefault();
            return t.fontSpacingOneFun.apply(null, arguments);
          },
          "!blur": function (e) {
            return t.blurSetFontSize(t.fontInfo.size);
          },
          keyup: [function (e) {
            if (!e.type.indexOf("key") && t._k(e.keyCode, "enter", 13, e.key, "Enter")) {
              return null;
            } else {
              return t.keyEnterFontSize(t.fontInfo.size);
            }
          }, function (e) {
            return t.plusOne(e);
          }],
          "!focus": function (e) {
            t.focusOne = true;
          },
          mousewheel: function (e) {
            e.stopPropagation();
            return t.wheelOne(e);
          }
        },
        model: {
          value: t.fontInfo.size,
          callback: function (e) {
            t.$set(t.fontInfo, "size", e);
          },
          expression: "fontInfo.size"
        }
      }, [n("baseSvg", {
        staticClass: "cursorw svg-16 ml4",
        attrs: {
          name: "#iconshezhizitidaxiao"
        },
        nativeOn: {
          mousedown: function (e) {
            return t.fontSizeDown.apply(null, arguments);
          }
        }
      })], 1)], 1), n("div", {
        staticClass: "ml6 f-space f-baseX f-alignNone"
      }, t._l(t.oldVersionFont, function (e, a) {
        return n("button", {
          key: "zt-set10" + a,
          staticClass: "old-version-btn",
          on: {
            click: function (n) {
              return t.setOldFontSize(e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0)]), t._m(0), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.set.ztExpandMultiple ? t.fontSpacingIstrueArr[0] : t.fontSpacingIstrue == 0,
          expression: "set.ztExpandMultiple ? fontSpacingIstrueArr[0] : fontSpacingIstrue == 0"
        }],
        staticClass: "fontSpacing theme-mt"
      }, t._l(t.set.ztDefaultSize, function (e, a) {
        return n("button", {
          key: "zt-set" + a,
          staticClass: "btn-small btn-small-6 mb8",
          class: (a + 1) % 6 == 0 ? "mr0" : "",
          on: {
            click: function (n) {
              return t.setFontSize(e);
            },
            contextmenu: function (n) {
              return t.fpSetFontSize("layer_font_setFontSize", e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0), n("div", {
        staticClass: "f-baseX mt10 app-padding"
      }, [n("div", {
        staticClass: "f-baseX",
        attrs: {
          title: "设置行距"
        }
      }, [n("baseInputMore", {
        ref: "refFontLeading",
        staticClass: "input-setFont f-space",
        attrs: {
          size: "small"
        },
        on: {
          menu: t.fontSpacingTwoFun,
          handle: t.fontSpacingTwoFun
        },
        nativeOn: {
          contextmenu: function (e) {
            e.preventDefault();
            return t.fontSpacingTwoFun.apply(null, arguments);
          },
          "!blur": function (e) {
            return t.blurSetFontLeading2(t.leadingVal);
          },
          keyup: [function (e) {
            if (!e.type.indexOf("key") && t._k(e.keyCode, "enter", 13, e.key, "Enter")) {
              return null;
            } else {
              return t.keyEnterFontLeading(t.leadingVal);
            }
          }, function (e) {
            return t.plusTwo(e);
          }],
          "!focus": function (e) {
            t.focusTwo = true;
          },
          mousewheel: function (e) {
            e.stopPropagation();
            return t.wheelTwo(e);
          }
        },
        model: {
          value: t.leadingVal,
          callback: function (e) {
            t.leadingVal = e;
          },
          expression: "leadingVal"
        }
      }, [n("baseSvg", {
        staticClass: "cursorw svg-16 ml4",
        attrs: {
          name: "#iconshezhihangju"
        },
        nativeOn: {
          mousedown: function (e) {
            return t.fontSpacDown.apply(null, arguments);
          }
        }
      })], 1)], 1), n("div", {
        staticClass: "ml6 f-space f-baseX f-alignNone"
      }, t._l(t.oldVersionLeading, function (e, a) {
        return n("button", {
          key: "zt-set11" + a,
          staticClass: "old-version-btn",
          on: {
            click: function (n) {
              return t.setFontLeading(e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0)]), t._m(1), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.set.ztExpandMultiple ? t.fontSpacingIstrueArr[1] : t.fontSpacingIstrue == 1,
          expression: "set.ztExpandMultiple ? fontSpacingIstrueArr[1] : fontSpacingIstrue == 1"
        }],
        staticClass: "fontSpacing theme-mt"
      }, t._l(t.set.ztDefaultLeading, function (e, a) {
        return n("button", {
          key: "zt-set1" + a,
          staticClass: "btn-small btn-small-6 mb8",
          class: (a + 1) % 6 == 0 ? "mr0" : "",
          on: {
            click: function (n) {
              return t.setFontLeading(e);
            },
            contextmenu: function (n) {
              return t.fpSetFontSize("layer_font_setLeading", e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0), n("div", {
        staticClass: "app-padding "
      }, [n("div", {
        staticClass: "f-baseX mt10"
      }, [n("div", {
        staticClass: "f-baseX",
        attrs: {
          title: "设置字间距"
        }
      }, [n("baseInputMore", {
        ref: "refFontTrack",
        staticClass: "input-setFont  ff1",
        attrs: {
          size: "small"
        },
        on: {
          handle: t.fontSpacingTherrFun,
          menu: t.fontSpacingTherrFun
        },
        nativeOn: {
          contextmenu: function (e) {
            e.preventDefault();
            return t.fontSpacingTherrFun.apply(null, arguments);
          },
          "!blur": function (e) {
            return t.blurSetFontTracking(t.fontInfo.tracking);
          },
          keyup: function (e) {
            if (!e.type.indexOf("key") && t._k(e.keyCode, "enter", 13, e.key, "Enter")) {
              return null;
            } else {
              return t.keyEnterFontTrack(t.fontInfo.tracking);
            }
          },
          "!focus": function (e) {
            t.focusTherr = true;
          },
          mousewheel: function (e) {
            e.stopPropagation();
            return t.wheelTherr(e);
          }
        },
        model: {
          value: t.fontInfo.tracking,
          callback: function (e) {
            t.$set(t.fontInfo, "tracking", e);
          },
          expression: "fontInfo.tracking"
        }
      }, [n("baseSvg", {
        staticClass: "cursorw svg-16 ml4",
        attrs: {
          name: "#iconshezhijianju"
        },
        nativeOn: {
          mousedown: function (e) {
            return t.fontSpacText.apply(null, arguments);
          }
        }
      })], 1)], 1), n("div", {
        staticClass: "ml6 f-space f-baseX f-alignNone"
      }, t._l(t.oldVersionTracking, function (e, a) {
        return n("button", {
          key: "zt-set12" + a,
          staticClass: "old-version-btn",
          on: {
            click: function (n) {
              return t.setFontTracking(e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0)])]), t._m(2), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.set.ztExpandMultiple ? t.fontSpacingIstrueArr[2] : t.fontSpacingIstrue == 2,
          expression: "set.ztExpandMultiple ? fontSpacingIstrueArr[2] : fontSpacingIstrue == 2"
        }],
        staticClass: "fontSpacing theme-mt"
      }, t._l(t.set.ztDefaultTracking, function (e, a) {
        return n("button", {
          key: "zt-set2" + a,
          staticClass: "btn-small btn-small-6 mb8",
          class: (a + 1) % 6 == 0 ? "mr0" : "",
          on: {
            click: function (n) {
              return t.setFontTracking(e);
            },
            contextmenu: function (n) {
              return t.fpSetFontSize("zt_setFontTracking", e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0)]) : n("div", [n("div", {
        staticClass: "f-baseX mt10 app-padding"
      }, [n("div", {
        staticClass: "ff1 f-baseX",
        attrs: {
          title: "设置字体大小"
        }
      }, [n("baseSvg", {
        staticClass: "cursorw svg-20",
        attrs: {
          name: "#iconshezhizitidaxiao"
        },
        nativeOn: {
          mousedown: function (e) {
            return t.fontSizeDown.apply(null, arguments);
          }
        }
      }), n("baseInputMore", {
        ref: "refFontSize",
        staticClass: "ml6 f-space",
        attrs: {
          size: "small"
        },
        on: {
          menu: t.fontSpacingOneFun,
          handle: t.fontSpacingOneFun
        },
        nativeOn: {
          contextmenu: function (e) {
            e.preventDefault();
            return t.fontSpacingOneFun.apply(null, arguments);
          },
          "!blur": function (e) {
            return t.blurSetFontSize(t.fontInfo.size);
          },
          keyup: [function (e) {
            if (!e.type.indexOf("key") && t._k(e.keyCode, "enter", 13, e.key, "Enter")) {
              return null;
            } else {
              return t.keyEnterFontSize(t.fontInfo.size);
            }
          }, function (e) {
            return t.plusOne(e);
          }],
          "!focus": function (e) {
            t.focusOne = true;
          },
          mousewheel: function (e) {
            e.stopPropagation();
            return t.wheelOne(e);
          }
        },
        model: {
          value: t.fontInfo.size,
          callback: function (e) {
            t.$set(t.fontInfo, "size", e);
          },
          expression: "fontInfo.size"
        }
      })], 1), n("div", {
        staticClass: "setNbsp"
      }), n("div", {
        staticClass: "ff1 f-baseX",
        attrs: {
          title: "设置行距"
        }
      }, [n("baseSvg", {
        staticClass: "cursorw svg-22",
        attrs: {
          name: "#iconshezhihangju"
        },
        nativeOn: {
          mousedown: function (e) {
            return t.fontSpacDown.apply(null, arguments);
          }
        }
      }), n("baseInputMore", {
        ref: "refFontLeading",
        staticClass: "ml6 f-space",
        attrs: {
          size: "small"
        },
        on: {
          menu: t.fontSpacingTwoFun,
          handle: t.fontSpacingTwoFun
        },
        nativeOn: {
          contextmenu: function (e) {
            e.preventDefault();
            return t.fontSpacingTwoFun.apply(null, arguments);
          },
          "!blur": function (e) {
            return t.blurSetFontLeading2(t.leadingVal);
          },
          keyup: [function (e) {
            if (!e.type.indexOf("key") && t._k(e.keyCode, "enter", 13, e.key, "Enter")) {
              return null;
            } else {
              return t.keyEnterFontLeading(t.leadingVal);
            }
          }, function (e) {
            return t.plusTwo(e);
          }],
          "!focus": function (e) {
            t.focusTwo = true;
          },
          mousewheel: function (e) {
            e.stopPropagation();
            return t.wheelTwo(e);
          }
        },
        model: {
          value: t.leadingVal,
          callback: function (e) {
            t.leadingVal = e;
          },
          expression: "leadingVal"
        }
      })], 1)]), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.set.ztExpandMultiple ? t.fontSpacingIstrueArr[0] : t.fontSpacingIstrue == 0,
          expression: "set.ztExpandMultiple ? fontSpacingIstrueArr[0] : fontSpacingIstrue == 0"
        }],
        staticClass: "fontSpacing theme-mt"
      }, t._l(t.set.ztDefaultSize, function (e, a) {
        return n("button", {
          key: "zt-set" + a,
          staticClass: "btn-small btn-small-6 mb8",
          class: (a + 1) % 6 == 0 ? "mr0" : "",
          on: {
            click: function (n) {
              return t.setFontSize(e);
            },
            contextmenu: function (n) {
              return t.fpSetFontSize("layer_font_setFontSize", e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.set.ztExpandMultiple ? t.fontSpacingIstrueArr[1] : t.fontSpacingIstrue == 1,
          expression: "set.ztExpandMultiple ? fontSpacingIstrueArr[1] : fontSpacingIstrue == 1"
        }],
        staticClass: "fontSpacing theme-mt"
      }, t._l(t.set.ztDefaultLeading, function (e, a) {
        return n("button", {
          key: "zt-set1" + a,
          staticClass: "btn-small btn-small-6 mb8",
          class: (a + 1) % 6 == 0 ? "mr0" : "",
          on: {
            click: function (n) {
              return t.setFontLeading(e);
            },
            contextmenu: function (n) {
              return t.fpSetFontSize("layer_font_setLeading", e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0), n("div", {
        staticClass: "app-padding"
      }, [n("div", {
        staticClass: "f-baseX mt10"
      }, [n("div", {
        staticClass: "ff1 f-baseX",
        attrs: {
          title: "设置字间距"
        }
      }, [n("baseSvg", {
        staticClass: "cursorw svg-20",
        attrs: {
          name: "#iconshezhijianju"
        },
        nativeOn: {
          mousedown: function (e) {
            return t.fontSpacText.apply(null, arguments);
          }
        }
      }), n("baseInputMore", {
        ref: "refFontTrack",
        staticClass: "ml6 ff1",
        attrs: {
          size: "small"
        },
        on: {
          handle: t.fontSpacingTherrFun,
          menu: t.fontSpacingTherrFun
        },
        nativeOn: {
          contextmenu: function (e) {
            e.preventDefault();
            return t.fontSpacingTherrFun.apply(null, arguments);
          },
          "!blur": function (e) {
            return t.blurSetFontTracking(t.fontInfo.tracking);
          },
          keyup: [function (e) {
            if (!e.type.indexOf("key") && t._k(e.keyCode, "enter", 13, e.key, "Enter")) {
              return null;
            } else {
              return t.keyEnterFontTrack(t.fontInfo.tracking);
            }
          }, function (e) {
            return t.plusTherr(e);
          }],
          "!focus": function (e) {
            t.focusTherr = true;
          },
          mousewheel: function (e) {
            e.stopPropagation();
            return t.wheelTherr(e);
          }
        },
        model: {
          value: t.fontInfo.tracking,
          callback: function (e) {
            t.$set(t.fontInfo, "tracking", e);
          },
          expression: "fontInfo.tracking"
        }
      })], 1), n("div", {
        staticClass: "setNbsp"
      }), n("div", {
        staticClass: "ff1 f-baseX",
        attrs: {
          title: "设置两个字符间的字距为视觉"
        }
      }, [n("baseCheck", {
        on: {
          change: t.setAutoKerning
        },
        model: {
          value: t.isOpticalKern,
          callback: function (e) {
            t.isOpticalKern = e;
          },
          expression: "isOpticalKern"
        }
      }, [t._v(" 文字视觉调整 ")])], 1)])]), n("div", {
        directives: [{
          name: "show",
          rawName: "v-show",
          value: t.set.ztExpandMultiple ? t.fontSpacingIstrueArr[2] : t.fontSpacingIstrue == 2,
          expression: "set.ztExpandMultiple ? fontSpacingIstrueArr[2] : fontSpacingIstrue == 2"
        }],
        staticClass: "fontSpacing theme-mt"
      }, t._l(t.set.ztDefaultTracking, function (e, a) {
        return n("button", {
          key: "zt-set2" + a,
          staticClass: "btn-small btn-small-6 mb8",
          class: (a + 1) % 6 == 0 ? "mr0" : "",
          on: {
            click: function (n) {
              return t.setFontTracking(e);
            },
            contextmenu: function (n) {
              return t.fpSetFontSize("zt_setFontTracking", e);
            }
          }
        }, [t._v(" " + t._s(e) + " ")]);
      }), 0)])]);
    }
```