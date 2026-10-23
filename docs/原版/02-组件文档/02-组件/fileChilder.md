# fileChilder

> 来源：`app/56d7.js`　大小：12.7KB
> 特征：props / data / methods

## 子组件

`GIcon`、`GInput`

## props（5）

`forData`、`index`、`num`、`fileNumber`、`besideScrollInfo`

## methods（16）

`getHighLightWidth`、`getFolderLineLength`、`changeEditInput`、`setShowChildren`、`confirmRenameFolder`、`confirmAddFolder`、`confirmInput`、`initFolderNameInput`、`showMenu`、`callback`、`exportFolderPack`、`exportFolderComputer`、`getOffsetTop`、`mousemoveIndexFun`、`drag`、`select`

## jsx 调用（PS 能力）

- `Fs_selectFolder`
- `Fs_openFolder`

## 文案（25）

输入字符数不超过 · 位 · 新建文件夹成功 · 请输入文件名 · 新建子文件夹 · 未命名文件夹 · 重命名 · 文件夹图标 · 导出素材包 · 确认提示 · 存在同名的素材包文件夹 · 是否要覆盖 · 创建文件夹失败 · 请检查选择路径是否有误 · 导出到计算机 · 删除 · 删除后文件夹无法还原 · 是否继续 · 删除文件夹 · 正在移除到回收站 · 已删除 · 将文件夹内模板移入回收站 · 正在导出素材包 · 导出成功 · 正在导出

## 源码

```js
{
  name: "fileChilder",
  components: {
    GIcon: ie.a,
    GInput: $a.a
  },
  props: {
    forData: null,
    index: null,
    num: null,
    fileNumber: null,
    besideScrollInfo: {
      type: Object,
      default: function () {
        return {
          scrollLeft: 0,
          clientWidth: 0
        };
      }
    }
  },
  data: function () {
    return {
      mouseIndex: null,
      data: Ln.a,
      edit: {
        value: "",
        state: 0,
        confirmType: ""
      }
    };
  },
  methods: {
    getHighLightWidth: function (t) {
      var e = t * 20 - 10;
      var n = this.besideScrollInfo.scrollLeft;
      var a = this.besideScrollInfo.clientWidth;
      a ||= document.body.clientWidth - 58;
      var i = a > e - n;
      if (i) {
        return a + n - e - 56 + "px";
      } else {
        return "100%";
      }
    },
    getFolderLineLength: function (t) {
      var e = this;
      var n = function t(n) {
        if (!n.showChildren) {
          return 0;
        }
        var a = n.children.reduce(function (n, a) {
          var i = n + (a.showChildren ? t(a) : 0);
          if (a.id === e.$temp.newFolderParentsId) {
            i++;
          }
          return i;
        }, n.children.length);
        return a;
      };
      var a = n(t);
      if (t.id === this.$temp.newFolderParentsId) {
        a++;
      }
      return a * 25 + "px";
    },
    changeEditInput: function (t) {
      var e = t.target.value.substring(0, 38);
      if (t.target.value.length > 38) {
        G.a.info("输入字符数不超过38位");
        t.target.value = e;
      }
      this.edit.value = e;
    },
    setShowChildren: function (t) {
      t.showChildren = !t.showChildren;
      this.$emit("changeShowChildren");
    },
    confirmRenameFolder: function (t) {
      if (this.confirmInput(t)) {
        Pc.renameFolder(this.$temp.renameFolderId, this.edit.value);
        this.$bp.add("mb_031");
        this.initFolderNameInput();
      }
    },
    confirmAddFolder: function (t) {
      if (this.confirmInput(t)) {
        Pc.addChilderFolder(this.$temp.newFolderParentsId, this.edit.value);
        G.a.success("新建文件夹成功");
        this.$bp.add("mb_030");
        this.initFolderNameInput();
      }
    },
    confirmInput: function (t) {
      if (t === "enter") {
        this.edit.confirmType = "enter";
      } else if (t === "blur" && this.edit.confirmType === "enter") {
        this.edit.confirmType = "";
        return false;
      }
      return this.edit.value !== "" || (G.a.error("请输入文件名"), false);
    },
    initFolderNameInput: function () {
      Object.assign(this.edit, {
        value: "",
        state: 0
      });
    },
    showMenu: function (t, e, n) {
      var a = this;
      var i = [{
        text: "新建子文件夹",
        callback: function (t, n) {
          a.$temp.newFolderParentsId = e.id;
          if (!e.showChildren) {
            a.setShowChildren(e);
          }
          Object.assign(a.edit, {
            value: "未命名文件夹",
            state: 2
          });
          a.$nextTick(function () {
            a.$refs.folderInput[0].select();
          });
        }
      }, {
        text: "重命名",
        callback: function (t, n) {
          a.$temp.renameFolderId = e.id;
          Object.assign(a.edit, {
            value: e.name,
            type: 1
          });
          a.$nextTick(function () {
            a.$refs.folderInput[0].select();
          });
        }
      }, {
        text: "文件夹图标",
        callback: function (n, i) {
          a.$bp.add("mb_036");
          var r = document.documentElement.scrollTop || document.body.scrollTop;
          var s = t.pageY || t.clientY + r;
          a.$appBus.emit("tempShowSetFolderIcon", {
            id: e.id,
            icon: e.icon ? e.icon : 0,
            color: e.iconColor ? e.iconColor : 0,
            offsetHeight: s - 25
          });
          a.$store.state.fileSvgIstrue = true;
        }
      }, {
        text: "导出素材包(.pszlpack)",
        callback: function () {
          var t = Object(d.a)(regeneratorRuntime.mark(function t(n, i) {
            var r;
            var s;
            var o;
            return regeneratorRuntime.wrap(function (t) {
              while (1) {
                switch (t.prev = t.next) {
                  case 0:
                    t.next = 2;
                    return a.$cep.jsxNoCheck("Fs_selectFolder");
                  case 2:
                    r = t.sent;
                    a.$log.push("导出素材包" + r);
                    if (r != -1) {
                      t.next = 6;
                      break;
                    }
                    return t.abrupt("return");
                  case 6:
                    s = r + "/" + e.name + ".pszlpack";
                    if (!D.a.isFolder(s)) {
                      t.next = 10;
                      break;
                    }
                    a.$msg.confirm("确认提示", "存在同名的素材包文件夹，是否要覆盖？", function () {
                      a.exportFolderPack(e.id, s);
                    });
                    return t.abrupt("return");
                  case 10:
                    o = D.a.createFolder(s);
                    if (o !== false) {
                      t.next = 13;
                      break;
                    }
                    return t.abrupt("return", a.$msg.showErr("创建文件夹失败，请检查选择路径是否有误"));
                  case 13:
                    a.exportFolderPack(e.id, s);
                    a.$bp.add("mb_034");
                  case 15:
                  case "end":
                    return t.stop();
                }
              }
            }, t);
          }));
          function n(e, n) {
            return t.apply(this, arguments);
          }
          return n;
        }()
      }, {
        text: "导出到计算机",
        callback: function () {
          var t = Object(d.a)(regeneratorRuntime.mark(function t(n, i) {
            var r;
            var s;
            var o;
            return regeneratorRuntime.wrap(function (t) {
              while (1) {
                switch (t.prev = t.next) {
                  case 0:
                    t.next = 2;
                    return a.$cep.jsxNoCheck("Fs_selectFolder");
                  case 2:
                    r = t.sent;
                    a.$log.push("导出到计算机" + r);
                    if (r != -1) {
                      t.next = 6;
                      break;
                    }
                    return t.abrupt("return");
                  case 6:
                    s = r + "/" + e.name;
                    if (!D.a.isFolder(s)) {
                      t.next = 10;
                      break;
                    }
                    a.$msg.confirm("确认提示", "存在同名的素材包文件夹，是否要覆盖？", function () {
                      a.exportFolderComputer(e.id, r);
                    });
                    return t.abrupt("return");
                  case 10:
                    o = D.a.createFolder(s);
                    if (o != 0) {
                      t.next = 13;
                      break;
                    }
                    return t.abrupt("return", a.$msg.showErr("创建文件夹失败，请检查选择路径是否有误"));
                  case 13:
                    a.exportFolderComputer(e.id, r);
                    a.$bp.add("mb_035");
                  case 15:
                  case "end":
                    return t.stop();
                }
              }
            }, t);
          }));
          function n(e, n) {
            return t.apply(this, arguments);
          }
          return n;
        }()
      }, {
        text: "fg"
      }, {
        text: "删除",
        callback: function (t, n) {
          a.$msg.confirm("确认提示", "删除后文件夹无法还原，是否继续？", function (t) {
            a.$load.show("删除文件夹");
            Pc.deleteFolder(e.id, function (t, e) {
              a.$load.show("正在移除到回收站：" + t + "/" + e);
            }, function () {
              a.$load.hide();
              G.a.success("已删除");
            }, t);
            a.$bp.add("mb_032");
          }, {
            show: true,
            isCheck: true,
            content: "将文件夹内模板移入回收站"
          });
        }
      }];
      this.$menu.show(i, true, t);
    },
    exportFolderPack: function (t, e) {
      var n = this;
      return Object(d.a)(regeneratorRuntime.mark(function a() {
        return regeneratorRuntime.wrap(function (a) {
          while (1) {
            switch (a.prev = a.next) {
              case 0:
                a.next = 2;
                return n.$temp.exportFolderPack(t, e, function (t, e) {
                  n.$load.show("正在导出素材包：" + t + "/" + e);
                });
              case 2:
                n.$load.hide();
                n.$cep.jsx("Fs_openFolder", [e]);
                n.$tips.show("导出成功");
              case 5:
              case "end":
                return a.stop();
            }
          }
        }, a);
      }))();
    },
    exportFolderComputer: function (t, e) {
      var n = this;
      return Object(d.a)(regeneratorRuntime.mark(function a() {
        var i;
        return regeneratorRuntime.wrap(function (a) {
          while (1) {
            switch (a.prev = a.next) {
              case 0:
                a.next = 2;
                return n.$temp.exportFolderComputer(t, e, function (t, e) {
                  n.$load.show("正在导出：" + t + "/" + e);
                });
              case 2:
                i = a.sent;
                n.$load.hide();
                n.$cep.jsx("Fs_openFolder", [i]);
                n.$tips.show("导出成功");
              case 6:
              case "end":
                return a.stop();
            }
          }
        }, a);
      }))();
    },
    getOffsetTop: function (t) {
      var e = t.offsetTop;
      var n = t.offsetParent;
      while (n != null) {
        e += n.offsetTop;
        n = n.offsetParent;
      }
      return e;
    },
    mousemoveIndexFun: function (t, e) {
      if (this.$store.state.mouseDownIstrue && (this.mouseIndex = e, this.$store.state.file.mouseUpData = this.forData[e].id, this.num == null ? this.$store.state.file.mouseIndex = e : this.$store.state.file.mouseIndex = this.num + "-" + e, this.$store.state.fileDownNode && this.$store.state.mouseDownIstrue)) {
        this.$store.state.test = t.clientX;
        var n = this.$store.state.fileDownNode.parentNode.contains(t.currentTarget);
        if (n) {
          this.$store.state.notAllowed = n;
          this.mouseIndex = -1;
        } else {
          this.$store.state.notAllowed = n;
          var a = (document.querySelector(".file-vuescroll") || {
            scrollTop: 0
          }).scrollTop;
          var i = event.clientY + a - this.getOffsetTop(t.currentTarget);
          if (i < 5) {
            t.currentTarget.className = "f-baseX mousehover  deviation-top";
            this.$store.state.file.state = "top";
          } else if (i > 20) {
            t.currentTarget.className = "f-baseX mousehover  deviation-bottom";
            this.$store.state.file.state = "bottom";
          } else {
            t.currentTarget.className = "f-baseX mousehover select selectHover";
            this.$store.state.file.state = "cen";
          }
        }
      }
    },
    drag: function (t, e) {
      var n = this;
      if (Object(ft.f)()) {
        this.$store.state.fileDownNode = t.currentTarget;
        this.$store.state.file.mouseDownData = this.forData[e].id;
        this.$temp.folderId = this.forData[e].id;
        this.mouseIndex = e;
        var a = e;
        this.$store.state.mouseDownIstrue = true;
        var i = t.currentTarget;
        var r = i.cloneNode(true);
        t.clientX;
        t.clientY;
        r.className += " clone";
        document.body.querySelector(".Template").appendChild(r);
        function s() {
          var t = event.clientX;
          var e = event.clientY;
          r.style.cssText = "left:" + (t - 35) + "px;top:" + (e + 5) + "px;height: auto;z-index: 10;background-color:#006FFF;width:80%";
        }
        var o = function t(e) {
          n.$store.state.mouseDownIstrue = false;
          document.body.querySelector(".Template").removeChild(r);
          if (n.mouseIndex !== a && !n.$store.state.notAllowed) {
            if (event.clientX < 0 || event.clientX > document.body.offsetWidth || event.clientY < 0 || event.clientY > document.body.offsetHeight) {
              return;
            }
            if (!n.$store.state.file.mouseUpData) {
              return;
            }
            n.$temp.moveFolder(n.$store.state.file.mouseDownData, n.$store.state.file.mouseUpData, n.$store.state.file.state);
          }
          n.$store.state.notAllowed = false;
          document.removeEventListener("mousemove", s);
          document.removeEventListener("mouseup", t);
        };
        document.addEventListener("mousemove", s);
        document.addEventListener("mouseup", o);
      }
    },
    select: function (t, e) {
      this.$temp.setSelectFolder(e);
      this.$store.state.showMenu = -1;
      this.$emit("changeId", e);
    }
  }
}
```