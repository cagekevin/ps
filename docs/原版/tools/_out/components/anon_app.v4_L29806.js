{
      components: {
        Sortcom: du,
        filecom: Qc,
        NoLibrary: ul,
        emptyRecycle: vl,
        EmptyLibrary: kl,
        NoResult: Il,
        TemplateItemDropdownMenu: ru,
        RelateTag: Su,
        moveFileToFolder: Du,
        fileSvg: $u,
        BackTop: qu,
        ToggleTemplateInfoDisplay: eh,
        ZoomInOut: pi,
        InputSearch: Xa,
        OtherFilters: fh,
        AddTemplate: zh,
        ListLoading: Nh,
        RecycleDeleteLoading: Yh,
        FileNav: Uh,
        ShowFolderSubFolder: ad,
        Icon: ie.a,
        CepModal: Yt
      },
      data: function () {
        return {
          historyFolderRecords: [],
          sortFunVal: Jl.a.day,
          order: true,
          set: V.a.info,
          renderList: {
            height: [0, 0, 0, 0],
            column: [[], [], [], []]
          },
          findText: "",
          serchLabelData: [],
          fileDropDown: false,
          data: Ln.a,
          labelIndex: 0,
          columnNum: 2,
          showMax: 100,
          showPageNum: 1,
          selectArr: [],
          showFileMenu: false,
          fileMenuX: 0,
          fileMenuY: 0,
          showTags: false,
          settime: null,
          isLoadAll: false,
          tempInput: "",
          previewImg: null,
          starScale: 1,
          showMoveFile: false,
          getImgData: [],
          imgWidth: 104,
          testImg: [],
          searchResults: [],
          imgList: [],
          backShowList: [],
          batchShowList: [],
          columnHeight: [],
          showPosition: [],
          loadImgNum: 0,
          imgStart: 0,
          imgEnd: 0,
          scrollTop: 0,
          tagsText: "",
          setFolderIcon: "",
          isMac: D.a.getOsPrefix(),
          firstLoadPreview: true,
          btnTime: null,
          listService: null,
          addToTemplateMode: "one",
          loading: false,
          isShowDeleteTemLoading: false,
          handleTemplateLoadingText: "",
          isAddTemplate: false,
          setFolderWindowTop: 0,
          setFolderIconInfo: {
            offsetHeight: 0,
            icon: 0,
            color: 0
          },
          hasSearched: false,
          isShowForEverDeleteDialog: false
        };
      },
      computed: {
        selectStatus: function () {
          var t = [];
          for (var e = 0; e < this.data.showList.length; e++) {
            if (this.selectArr.indexOf(e) === -1) {
              t.push("");
            } else {
              t.push("select-img");
            }
          }
          return t;
        },
        timeVal: function () {
          if (this.listService) {
            return this.listService.query.time;
          } else {
            return [];
          }
        },
        scoreVal: function () {
          if (this.listService) {
            return this.listService.query.scores;
          } else {
            return [];
          }
        },
        tagVal: function () {
          if (this.listService) {
            return this.listService.query.tags;
          } else {
            return [];
          }
        },
        filterNum: function () {
          var t = this.timeVal;
          var e = this.scoreVal;
          var n = this.tagVal;
          return t.length + e.length + n.length;
        },
        hasSearchedOrFiltered: function () {
          return this.hasSearched || this.filterNum || this.data.folderId;
        }
      },
      watch: {
        "$store.state.showMenu": function (t, e) {
          if (t !== -1) {
            this.showFileMenu = false;
          }
        },
        $route: {
          handler: function (t, e) {
            if (t.path === "/template") {
              this.listService = eu;
              eu.init(this);
              this.serchLabelData = eu.serchLabelData;
            }
            if (this.firstLoadPreview && t.path === "/template") {
              this.updataPreviewList();
              this.firstLoadPreview = false;
            }
          },
          immediate: true
        },
        showTags: function () {
          if (this.showTags === false) {
            xu.updataHistoryTags();
          }
        },
        "set.mbShowName": function (t) {
          var e = this;
          setTimeout(function () {
            e.updataPostion();
          }, 100);
        },
        "set.mbShowPsdSize": function (t) {
          var e = this;
          setTimeout(function () {
            e.updataPostion();
          }, 100);
        },
        "$store.state.winWidth": function (t) {
          var e = this;
          clearTimeout(this.settime);
          this.settime = setTimeout(function () {
            try {
              e.updataPostion();
            } catch (t) {}
          }, 35);
        },
        "data.folderId": function (t) {
          this.labelIndex = this.$temp.folderId;
        },
        previewImg: function (t, e) {
          var n = this;
          if (t != null) {
            this.$nextTick(function () {
              n.previewNode = n.$refs.previewImg;
            });
          } else {
            this.starScale = 1;
          }
        }
      },
      created: function () {
        var t = this;
        return Object(d.a)(regeneratorRuntime.mark(function e() {
          return regeneratorRuntime.wrap(function (e) {
            while (1) {
              switch (e.prev = e.next) {
                case 0:
                  t.$store.commit("setTemplateData", Ln.a);
                  xu.initTagsData();
                  Ln.a.setTagHandler(xu);
                  t.columnNum = t.set.mbShowColumnNum;
                  t.sortFunVal = t.set.mbSortFunVal;
                  t.order = t.set.mbOrder;
                  t.labelIndex = t.$temp.folderId;
                  t.$appBus.on("mbAddTemp", function () {
                    t.$router.push("/template");
                    setTimeout(function () {
                      t.addTemplate();
                    }, 50);
                  });
                  t.$appBus.on("mbShowHideName", t.setShowName);
                  t.$appBus.on("tempShowSetFolderIcon", t.showSetFolderIcon);
                  t.$appBus.on("mbShowFolder", function () {
                    t.$appBus.emit("appGoNav", 0);
                    t.dropOpen("filecom");
                  });
                  t.addEventListeners();
                case 12:
                case "end":
                  return e.stop();
              }
            }
          }, e);
        }))();
      },
      mounted: function () {
        this.changeId();
      },
      methods: {
        openPreviewPage: function (t, e) {
          var n = this;
          var a = t.name;
          var i = t.height;
          var r = t.width;
          var s = t.size;
          var o = t.id;
          var c = this.isMac + this.imgList[e];
          var l = {
            id: o,
            size: s,
            title: a,
            composite_preview: null,
            type: "personal-template",
            preview: {
              url: c,
              width: r,
              height: i
            },
            useTemplate: function () {
              return n.clickPreview(e);
            }
          };
          this.$store.commit("setPreviewInfo", l);
        },
        setAddTemplateType: function (t) {
          this.isAddTemplate = t;
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
        showBtnMenu: function (t, e, n) {
          var a = this;
          var i = [{
            text: "创建文件夹",
            callback: function (t, n) {
              a.$inputBox.show(function (t) {
                a.$temp.addPeerFolder(e.id, t);
                a.$bp.add("mb_030");
              }, "请输入文件夹名称");
            }
          }, {
            text: "重命名文件夹",
            callback: function (t, n) {
              a.$inputBox.show(function (t) {
                a.$temp.renameFolder(e.id, t);
                a.$bp.add("mb_031");
              }, "请输入新名称", e.name);
            }
          }, {
            text: "删除文件夹",
            callback: function (t, n) {
              a.$msg.confirm("确认提示", "删除后文件夹无法还原，是否继续？ PSD文件将放入回收站", function (t) {
                a.$load.show("删除文件夹");
                a.$temp.deleteFolder(e.id, function (t, e) {
                  a.$load.show("正在移除到回收站：" + t + "/" + e);
                }, function () {
                  a.$load.hide();
                  a.$tips.show("删除成功");
                });
                a.$bp.add("mb_032");
              }, {
                show: true,
                isCheck: true,
                content: "啦啦啦"
              });
            }
          }, {
            text: "重新加载文件夹",
            callback: function (t, n) {
              a.$load.show("正在更新当前文件夹配置信息...");
              setTimeout(function () {
                a.$temp.refreshFolderInfo(e.id);
                a.$load.hide();
                a.$tips.show("更新成功");
              }, 10);
              a.$bp.add("mb_033");
            }
          }, {
            text: "fg"
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
                        return t.abrupt("return", a.$tips.show("取消操作"));
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
                        if (o != 0) {
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
                        return t.abrupt("return", a.$tips.show("取消操作"));
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
          }];
          this.$menu.show(i, true, t);
        },
        btnClick: function (t, e) {
          var n = this;
          clearTimeout(this.btnTime);
          this.btnTime = setTimeout(function () {
            n.changeindex(t, e);
          }, 200);
        },
        btnDblclick: function (t) {
          clearTimeout(this.btnTime);
          this.openFolder(t);
        },
        updataName: function () {
          var t = this;
          setTimeout(function () {
            t.updataPostion();
          }, 100);
        },
        openFolder: function (t) {
          if (this.$temp.folderInfo && this.$temp.folderInfo !== t.id) {
            this.historyFolderRecords.push(this.$temp.folderInfo);
          }
          if (this.$temp.folderInfo !== t.id) {
            this.$temp.setSelectFolder(t);
            this.changeId();
          }
        },
        openFolderForward: function () {
          if (this.historyFolderRecords.length !== 0) {
            this.$temp.setSelectFolder(this.historyFolderRecords.pop());
            this.changeId();
          }
        },
        isOpen: function (t, e) {
          this[e] = t;
        },
        showSetFolderIcon: function (t) {
          this.setFolderIcon = t.id;
          Object.assign(this.setFolderIconInfo, {
            color: t.color,
            icon: t.icon,
            offsetHeight: t.offsetHeight
          });
        },
        confirmFunFileSvg: function (t, e) {
          Pc.setFolderIcon(this.setFolderIcon, t, e);
        },
        updataScrollStatus: function () {
          this.scrollTop = this.$refs.lazy.scrollTop;
        },
        setScrollStatus: function () {
          var t = this;
          setTimeout(function () {
            var e = t.scrollTop >= 200 ? 88 : 0;
            t.$refs.lazy.scrollTop = t.scrollTop + e;
          }, 100);
        },
        dropAdd: function (t) {
          if (t.dataTransfer.types[0].indexOf("com.adobe.cep") != -1) {
            this.addTemplate();
          }
        },
        addTemplate: function () {
          this.addToTemplateMode = "one";
          this.handleAddTemplate(this.$temp.addTemplate.bind(this.$temp));
          this.$tracker.functionApply({
            function_source: "模板库页_个人模板",
            function_name: "合并存为模板"
          });
        },
        addToMultipleTemplates: function () {
          this.addToTemplateMode = "multiple";
          this.handleAddTemplate(this.$temp.addPsdSplit.bind(this.$temp));
          this.$tracker.functionApply({
            function_source: "模板库页_个人模板",
            function_name: "逐个存为模板"
          });
        },
        handleAddTemplate: function (t) {
          var e = this;
          return Object(d.a)(regeneratorRuntime.mark(function n() {
            var a;
            return regeneratorRuntime.wrap(function (n) {
              while (1) {
                switch (n.prev = n.next) {
                  case 0:
                    e.$createElement;
                    e.loading = true;
                    e.$bp.add("mb_010");
                    e.updataScrollStatus();
                    a = setTimeout(Object(d.a)(regeneratorRuntime.mark(function n() {
                      var i;
                      var r;
                      return regeneratorRuntime.wrap(function (n) {
                        while (1) {
                          switch (n.prev = n.next) {
                            case 0:
                              n.prev = 0;
                              n.next = 3;
                              return t();
                            case 3:
                              i = n.sent;
                              e.loading = false;
                              if (i.err != 1) {
                                n.next = 7;
                                break;
                              }
                              return n.abrupt("return", e.$msg.showErr(i.msg));
                            case 7:
                              r = e.getCateName();
                              G.a.success(function (t) {
                                return t("span", ["已导入至“", t("span", {
                                  style: "text-decoration: underline"
                                }, [r]), "”"]);
                              });
                              eu.reloadListOnlyByFile();
                              eu.reloadListWithRecomputedFiltersCache();
                              e.setScrollStatus();
                              e.$bp.add("mb_011");
                              n.next = 20;
                              break;
                            case 15:
                              n.prev = 15;
                              n.t0 = n.catch(0);
                              e.loading = false;
                              e.$msg.showErr("添加失败：" + n.t0);
                              e.$bp.add("mb_012");
                            case 20:
                              n.prev = 20;
                              clearTimeout(a);
                              return n.finish(20);
                            case 23:
                            case "end":
                              return n.stop();
                          }
                        }
                      }, n, null, [[0, 15, 20, 23]]);
                    })), 300);
                  case 5:
                  case "end":
                    return n.stop();
                }
              }
            }, n);
          }))();
        },
        getCateName: function () {
          if (this.pathName() != "") {
            return this.pathName();
          } else {
            return this.data.folderInfo.name;
          }
        },
        changeId: function () {
          this.labelIndex = -1;
          eu.reloadListWithRecomputedFiltersCache();
        },
        menuUpdataPreview: function (t) {
          var e = t === "delete";
          if (e) {
            this.updataScrollStatus();
          }
          this.updataPreviewList();
          if (e) {
            this.setScrollStatus();
          }
        },
        handleSearch: function () {
          this.selectArr = [];
          eu.handleSearch(this);
          eu.initBatchShowList(this);
        },
        updataPreviewList: function () {
          this.selectArr = [];
          eu.updataShowList(this);
          eu.initBatchShowList(this);
        },
        changePreviewImg: function (t, e) {
          var n = this;
          this.imgList.splice(e, 1, t);
          setTimeout(function () {
            n.updataPostion();
          }, 100);
        },
        loadImg: function () {
          this.loadImgNum++;
          if (this.loadImgNum == this.batchShowList.length) {
            this.computePosition(this.imgStart, this.imgEnd);
          }
        },
        computePosition: function (t, e) {
          var n = this.$refs.previewHeight.clientWidth;
          var a = [0, 10, 8, 6];
          var i = a[this.columnNum - 1];
          try {
            for (var r = t; r < e; r++) {
              var s = document.getElementById("previe-item-" + r);
              var o = s.offsetHeight;
              var c = this.getMinIndex(this.columnHeight);
              var l = c;
              var u = 10 + l * (n + i);
              var h = this.columnHeight[c];
              this.showPosition.push({
                left: u + "px",
                top: h + 10 + "px"
              });
              this.columnHeight[c] = this.columnHeight[c] + o + 10;
            }
          } catch (d) {}
        },
        updataPostion: function () {
          this.columnHeight = [];
          for (var t = 0; t < this.columnNum; t++) {
            this.columnHeight.push(0);
          }
          var e = this.$refs.previewHeight.clientWidth;
          var n = [0, 10, 8, 6];
          var a = n[this.columnNum - 1];
          try {
            for (var i = 0; i < this.showPosition.length; i++) {
              var r = document.getElementById("previe-item-" + i);
              var s = r.offsetHeight;
              var o = this.getMinIndex(this.columnHeight);
              var c = o;
              var l = 10 + c * (e + a);
              var u = this.columnHeight[o];
              this.showPosition.splice(i, 1, {
                left: l + "px",
                top: u + 10 + "px"
              });
              this.columnHeight[o] = this.columnHeight[o] + s + 10;
            }
          } catch (h) {}
        },
        updataCurrentFolder: function () {
          var t = this;
          this.$load.show("正在更新当前文件夹配置信息...");
          setTimeout(function () {
            var e = t.$temp.refreshFolderInfo(t.$temp.folderId);
            t.$load.hide();
            t.$msg.show(e == "" ? "更新成功" : e);
          }, 10);
        },
        bottomSortTop: function (t) {
          this.sortFunVal = t;
          this.set.mbSortFunVal = this.sortFunVal;
          eu.handleSort(this.data.showList, {
            dimension: this.sortFunVal,
            ascending: this.order
          });
          this.imgList = [];
          this.loadImgNum = 0;
          eu.setList(this.data.showList, this);
          this.refreshList();
          this.$bp.add("mb_" + this.sortFunVal);
        },
        bottomSortBottom: function (t) {
          this.order = t === "升序";
          this.set.mbOrder = this.order;
          eu.handleSort(this.data.showList, {
            dimension: this.sortFunVal,
            ascending: this.order
          });
          this.imgList = [];
          this.loadImgNum = 0;
          eu.setList(this.data.showList, this);
          this.refreshList();
        },
        refreshList: function () {
          this.selectArr = [];
          eu.initBatchShowList(this);
        },
        initReaderList: function () {
          this.showPageNum = 1;
          this.renderList.height.splice(0, this.renderList.height.length);
          for (var t = 0; t < this.columnNum; t++) {
            this.renderList.height.push(0);
          }
          var e;
          var n = Object(T.a)(this.renderList.column);
          try {
            for (n.s(); !(e = n.n()).done;) {
              var a = e.value;
              a.splice(0, a.length);
            }
          } catch (i) {
            n.e(i);
          } finally {
            n.f();
          }
          this.addRenderList(this.showPageNum);
        },
        templateListScrollCallback: function (t) {
          var e = t.target;
          var n = {
            scrollHeight: e.scrollHeight,
            clientHeight: e.clientHeight,
            scrollTop: e.scrollTop
          };
          this.slide(n);
        },
        slide: function (t) {
          var e = this;
          if (!this.isLoadAll) {
            var n = t.scrollHeight;
            var a = t.clientHeight;
            var i = t.scrollTop;
            var r = (a + i) / n;
            if (r > 0.9) {
              clearTimeout(this.settime);
              this.settime = setTimeout(function () {
                e.$log.push("loadTemp " + e.showPageNum + " " + r + " " + (a + i) + " " + (n - 250));
                e.isLoadAll = true;
                e.showPageNum++;
                eu.addBatchShowList(e, e.showPageNum);
              }, 100);
            }
          }
        },
        dropOpen: function (t) {
          this.$refs[t].open();
          if (t === "sortcom") {
            this.$bp.add("mb_014");
          }
        },
        moveFileToFolderHandle: function (t) {
          var e = this;
          this.showMoveFile = false;
          var n = this.isAddTemplate ? "正在添加文件..." : "正在移动文件...";
          this.$load.show(n);
          setTimeout(function () {
            if (!e.isAddTemplate) {
              var n = e.$temp.getIndexFileInfo(e.selectArr).map(function (t) {
                return t.id;
              });
              eu.removeTemplatesInFiltersCache(n);
            }
            if (e.isAddTemplate) {
              e.$temp.addFileToFolder(t, e.selectArr);
            } else {
              e.$temp.moveFileToFolder(t, e.selectArr);
            }
            e.$load.hide();
            G.a.success(e.isAddTemplate ? "添加成功" : "移动成功");
            e.updataPreviewList();
          }, 10);
        },
        pathName: function () {
          var t = "";
          var e = this.data.showType;
          if (e === 0) {
            t = "全部";
          } else if (e === 1) {
            t = "未分类";
          } else if (e === 2) {
            t = "回收站";
          } else if (e === 4) {
            t = "标签：" + this.tagsText;
          }
          return t;
        },
        changeindex: function (t, e) {
          var n = this;
          this.labelIndex = e.id;
          setTimeout(function () {
            n.$temp.setSelectChilderFolder(e);
            n.updataPreviewList();
          }, 10);
        },
        keyup: function (t) {
          var e = this;
          if (t.keyCode == 32) {
            var n = this.imgList[this.moveIndex];
            if (this.previewImg == null) {
              this.previewImg = n;
            } else {
              this.previewImg = null;
            }
            setTimeout(function () {
              e.$refs.inputPreview.focus();
            }, 10);
          }
        },
        scaleFun: function (t) {
          var e = t.wheelDelta / 3000;
          this.starScale += e;
          if (this.starScale < 0.5) {
            this.starScale = 0.5;
          }
          this.previewNode.style.transform = "scale(" + this.starScale + "," + this.starScale + ")";
        },
        previewImgFun: function (t) {
          var e = this;
          var n = event.clientX;
          var a = event.clientY;
          var i = n - this.previewNode.offsetLeft;
          var r = a - this.previewNode.offsetTop;
          var s = this.previewNode.style.cssText;
          function o() {
            var t = event.clientX - i;
            var n = event.clientY - r;
            e.previewNode.style.cssText = s + ";position: absolute;left:" + t + "px;top:" + n + "px;";
          }
          var c = function t() {
            document.removeEventListener("mousemove", o);
            document.removeEventListener("mouseup", t);
          };
          document.addEventListener("mousemove", o);
          document.addEventListener("mouseup", c);
        },
        setPreviewFocus: function (t) {
          var e = this;
          setTimeout(function () {
            e.$refs.inputPreview.focus();
            e.moveIndex = t;
            e.tempInput = "";
          }, 10);
        },
        removePreviewFocus: function () {
          var t = this;
          setTimeout(function () {
            t.$refs.inputPreview.blur();
            t.moveIndex = -1;
          }, 10);
        },
        clickPreview: function (t) {
          var e = this;
          this.data.showList[t].id;
          var n = Object(ft.c)(this.data.showList[t]);
          function a() {
            n.path = e.data.path.psd;
            n.useTmeplatePadding = e.set.mbUseTmeplatePadding;
            e.$cep.jsxHistoryNoCheck("mb_useTemplate", [encodeURIComponent(JSON.stringify(n))], "应用模板");
            e.$tracker.functionApply({
              function_source: "模板库页_个人模板",
              function_name: "应用到当前设计稿"
            });
          }
          var i = Object(ft.f)();
          var r = Object(ft.g)();
          var s = Object(ft.e)();
          if (i && s) {
            n.status = 1;
            a();
          } else if (i) {
            var o = this.selectArr.indexOf(t);
            if (o == -1) {
              this.selectArr.push(t);
            } else {
              this.selectArr.splice(o, 1);
            }
          } else if (r) {
            if (this.selectArr.length == 0) {
              return this.selectArr.push(t);
            }
            o = this.selectArr[this.selectArr.length - 1];
            var c = Math.min(o, t);
            var l = Math.max(o, t);
            this.selectArr = [];
            for (var u = c; u <= l; u++) {
              this.selectArr.push(u);
            }
          } else if (s) {
            n.status = 2;
            a();
          } else {
            n.status = 0;
            a();
          }
        },
        showPreviewMenu: function (t, e) {
          var n = this;
          var a = this.data.showList[e];
          if (this.selectArr.indexOf(e) == -1) {
            this.selectArr = [e];
          }
          if (this.$temp.showType == 2) {
            var i = [{
              text: "打开所在目录",
              callback: function (t, e) {
                n.$temp.openFileFolder(a.id);
              }
            }, {
              text: "还原",
              callback: function () {
                var t = Object(d.a)(regeneratorRuntime.mark(function t(e, a) {
                  var i;
                  var r;
                  var s;
                  var o;
                  return regeneratorRuntime.wrap(function (t) {
                    while (1) {
                      switch (t.prev = t.next) {
                        case 0:
                          i = JSON.parse(JSON.stringify(n.selectArr));
                          i.sort(function (t, e) {
                            return e - t;
                          });
                          r = [];
                          s = function (t) {
                            return new Promise(function () {
                              var e = Object(d.a)(regeneratorRuntime.mark(function e(a, i) {
                                var s;
                                var o;
                                var c;
                                var l;
                                var u;
                                var h;
                                var d;
                                var f;
                                var p;
                                return regeneratorRuntime.wrap(function (e) {
                                  while (1) {
                                    switch (e.prev = e.next) {
                                      case 0:
                                        s = n.batchShowList[t];
                                        o = [];
                                        if (s.folder.length) {
                                          c = Object(T.a)(s.folder);
                                          try {
                                            for (c.s(); !(l = c.n()).done;) {
                                              u = l.value;
                                              h = n.data.path.folder + "/" + u + ".json";
                                              if (D.a.isFile(h)) {
                                                o.push(u);
                                              }
                                            }
                                          } catch (i) {
                                            c.e(i);
                                          } finally {
                                            c.f();
                                          }
                                          if (!o.length) {
                                            r.push(t);
                                          }
                                        } else {
                                          r.push(t);
                                        }
                                        if (!o.length) {
                                          e.next = 15;
                                          break;
                                        }
                                        d = n.data.path.recycle + "/" + s.id + ".info/info.json";
                                        if (!D.a.isFile(d)) {
                                          e.next = 15;
                                          break;
                                        }
                                        D.a.write(d, JSON.stringify(s));
                                        f = n.data.path.psd + "/" + s.id + ".info/";
                                        p = n.data.path.recycle + "/" + s.id + ".info/";
                                        e.next = 11;
                                        return n.$cep.jsxNoCheck("Fs_copyFolder", [p, f]);
                                      case 11:
                                        e.next = 13;
                                        return n.$cep.jsxNoCheck("Fs_deleteFolder", [p]);
                                      case 13:
                                        e.next = 15;
                                        return n.$temp.backFileToFolder(o, [t]);
                                      case 15:
                                        a(true);
                                      case 16:
                                      case "end":
                                        return e.stop();
                                    }
                                  }
                                }, e);
                              }));
                              return function (t, n) {
                                return e.apply(this, arguments);
                              };
                            }());
                          };
                          o = i.map(function (t) {
                            return function () {
                              var t = Object(d.a)(regeneratorRuntime.mark(function t(e) {
                                return regeneratorRuntime.wrap(function (t) {
                                  while (1) {
                                    switch (t.prev = t.next) {
                                      case 0:
                                        t.next = 2;
                                        return s(e);
                                      case 2:
                                        return t.abrupt("return", t.sent);
                                      case 3:
                                      case "end":
                                        return t.stop();
                                    }
                                  }
                                }, t);
                              }));
                              return function (e) {
                                return t.apply(this, arguments);
                              };
                            }()(t);
                          });
                          t.next = 7;
                          return Promise.all(o);
                        case 7:
                          if (!r.length) {
                            t.next = 10;
                            break;
                          }
                          t.next = 10;
                          return n.$temp.restoreToUnfiled(r, function (t, e) {});
                        case 10:
                          n.updataPreviewList();
                          G.a.success("还原成功", 2.5);
                        case 12:
                        case "end":
                          return t.stop();
                      }
                    }
                  }, t);
                }));
                function e(e, n) {
                  return t.apply(this, arguments);
                }
                return e;
              }()
            }, {
              text: "fg"
            }, {
              text: "永久删除",
              callback: function () {
                n.isShowForEverDeleteDialog = true;
              }
            }];
            if (this.selectArr.length > 1) {
              i.unshift({
                text: "选择了" + this.selectArr.length + "个文件",
                class: "menu-disable-text"
              });
            }
            this.$menu.show(i, true, t);
          } else {
            setTimeout(function () {
              n.dropOpen("fileMenu");
              var e = document.documentElement.scrollLeft || document.body.scrollLeft;
              var a = document.documentElement.scrollTop || document.body.scrollTop;
              var i = t.pageX || t.clientX + e;
              var r = t.pageY || t.clientY + a;
              n.fileMenuX = "-300px";
              setTimeout(function () {
                var t = n.$refs.fileMenu.$el.clientWidth + 5;
                var e = n.$refs.fileMenu.$el.clientHeight + 10;
                var a = document.body.clientWidth;
                i = i + t > a ? a - t : i;
                var s = document.body.clientHeight;
                r = r + e > s ? s - e : r;
                n.fileMenuX = i + "px";
                n.fileMenuY = r + "px";
              }, 1);
            }, 1);
          }
        },
        getMinIndex: function (t) {
          var e = t[0];
          var n = 0;
          for (var a = 0; a < t.length; a++) {
            if (e > t[a]) {
              e = t[a];
              n = a;
            }
          }
          return n;
        },
        clickClear: function () {
          this.selectArr = [];
          this.showFileMenu = false;
        },
        setShowName: function () {
          this.set.mbShowName = !this.set.mbShowName;
          this.$bp.add("mb_013");
        },
        setIsShowDeleteTemLoading: function (t) {
          this.isShowDeleteTemLoading = t;
        },
        setHandleTemplateLoadingText: function (t) {
          this.handleTemplateLoadingText = t;
        },
        foreverDeleteOkClick: function () {
          var t = this;
          return Object(d.a)(regeneratorRuntime.mark(function e() {
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    t.isShowForEverDeleteDialog = false;
                    t.isShowDeleteTemLoading = true;
                    t.handleTemplateLoadingText = "正在删除";
                    e.prev = 3;
                    e.next = 6;
                    return Xc.deleteRecycleFile(t.selectArr, function (e, n) {
                      t.handleTemplateLoadingText = "正在删除 " + e + "/" + n;
                    });
                  case 6:
                    e.next = 12;
                    break;
                  case 8:
                    e.prev = 8;
                    e.t0 = e.catch(3);
                    G.a.warning("删除失败");
                    throw e.t0;
                  case 12:
                    t.selectArr = [];
                    t.updataPreviewList();
                    setTimeout(function () {
                      G.a.success("删除成功");
                      t.isShowDeleteTemLoading = false;
                    }, 200);
                  case 15:
                  case "end":
                    return e.stop();
                }
              }
            }, e, null, [[3, 8]]);
          }))();
        },
        togglePsdSizeShow: function () {
          this.set.mbShowPsdSize = !this.set.mbShowPsdSize;
        },
        importFolder: function () {
          this.$emit("importFolder");
        },
        importPack: function () {
          this.$emit("importPack");
        },
        createNewTemplate: function () {
          this.$emit("createNewTemplate");
        },
        openTemplate: function () {
          this.$emit("openTemplate");
        },
        getBackTopTarget: function () {
          return this.$refs.lazy;
        },
        handleColumnChange: function (t) {
          var e = this;
          this.columnNum = t;
          this.set.mbShowColumnNum = this.columnNum;
          setTimeout(function () {
            e.updataPostion();
          }, 10);
        },
        onSearch: function (t) {
          this.$temp.showAllTemplate();
          eu.onSearch(t, this);
          this.hasSearched = !!this.findText;
        },
        filterTime: function (t) {
          eu.filterTime(t, this);
        },
        filterScore: function (t) {
          eu.filterScore(t, this);
        },
        filterTag: function (t) {
          eu.filterTag(t, this);
        },
        handleVisibleChange: function (t) {
          if (t) {
            eu.setUpFiltersCache(this);
          }
        },
        useTempInCurrentDoc: function (t) {
          this.clickPreview(t);
        },
        addEventListeners: function () {
          var t = this;
          this.$on("toggleLibrary", function () {
            t.findText = "";
            eu.init(t);
            xu.initTagsData();
            t.updataPreviewList();
          });
        },
        toggleTagPanelVisible: function (t) {
          this.$emit("toggleTagPanelVisible", t);
        }
      }
    }