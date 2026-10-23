{
      components: {
        addTagsGroup: Fd,
        RemoveTagsToGroupDialog: Ed,
        IconFont: ie.a,
        check: Pd.a,
        GTooltip: jo.a,
        GInput: $a.a
      },
      data: function () {
        var t = "all";
        var e = "labelGroup";
        var n = "unclassified";
        var a = "commonLabel";
        return {
          groupIstrue: false,
          groupLabelData: null,
          currentLabelMenuValue: t,
          labelGroupMenuValue: e,
          commonLabelMenuValue: a,
          labelMenuData: [{
            label: "全部",
            value: t
          }, {
            label: "标签分组",
            value: e
          }, {
            label: "未分类",
            value: n
          }, {
            label: "常用标签",
            value: a
          }],
          showAddGroup: false,
          tagsVal: "",
          groupIndex: -1,
          groupLabelName: null,
          groupContextIndex: -1,
          currentLabel: "",
          labelUsedCount: {},
          newGroupName: "",
          renameGroupIndex: "",
          isShowAddGroup: false,
          setTagNameErrText: "",
          setLabelGroupNameErrText: "",
          isShowAddTagToGroupErrText: false,
          isShowAddCommUseTagsErr: false,
          isShowDeleteGroupDialog: false,
          isDeleteGroupAndLabel: false,
          recordDeleteGroupIndex: "",
          recordAddLabelGroupIndex: "",
          isShowCommUseAddLabelTooltip: false,
          findText: "",
          find: [],
          copyLabelGroupData: "",
          isShowRemoveTagsToGroupDialog: false
        };
      },
      computed: Object(P.a)(Object(P.a)({}, Object(mu.d)({
        data: function (t) {
          return t.templateCenter.tags;
        },
        labelClassifyData: function (t) {
          return t.templateCenter.labelClassifyData;
        }
      })), {}, {
        showCreate: function () {
          if (this.findText == "") {
            return false;
          }
          var t;
          var e = Object(T.a)(this.find);
          try {
            for (e.s(); !(t = e.n()).done;) {
              var n = t.value;
              if (n == this.findText) {
                return false;
              }
            }
          } catch (a) {
            e.e(a);
          } finally {
            e.f();
          }
          return true;
        }
      }),
      watch: {
        newGroupName: function () {
          if (this.newGroupName && this.newGroupName.trim()) {
            this.checkTagGroupNameIsOk();
          } else {
            this.setLabelGroupNameErrText = "";
          }
        },
        findText: function () {
          if (!this.findText || !this.findText.trim()) {
            this.isShowAddCommUseTagsErr = false;
            this.isShowAddTagToGroupErrText = false;
            return;
          }
          if (this.checkTagNameIsOk()) {
            this.isShowAddCommUseTagsErr = false;
            this.isShowAddTagToGroupErrText = false;
          }
        }
      },
      mounted: function () {
        if (this.data) {
          this.copyLabelGroupData = JSON.parse(JSON.stringify(this.data.group));
          this.getLabelUsedCount();
        }
      },
      methods: {
        getLabelUsedCount: function () {
          var t = this;
          this.labelUsedCount = {};
          var e = this.data.arr;
          e.forEach(function (e) {
            t.labelUsedCount[e.name] = e.id.length;
          });
        },
        labelFun: function (t) {
          this.groupIstrue = t.value === this.labelGroupMenuValue;
          this.currentLabelMenuValue = t.value;
        },
        findTags: function () {
          this.find = xu.findTags(this.findText);
        },
        findNotCommUseTags: function () {
          this.find = xu.findNotCommUseTags(this.findText);
        },
        createTagsAndSetCommUse: function () {
          if (this.showCreate == 0 && this.find.length) {
            return this.commUseAddTags(this.find[0]);
          }
          if (this.checkTagNameIsOk()) {
            this.isShowAddCommUseTagsErr = false;
            xu.addNewTags(this.findText);
            this.commUseAddTags(this.findText);
          } else {
            this.isShowAddCommUseTagsErr = true;
          }
        },
        checkTagNameIsOk: function () {
          if (this.findText && this.findText.trim()) {
            if (this.findText.length > Jl.c.limitCharCount) {
              this.setTagNameErrText = Jl.c.limitCharCountTipText;
              return false;
            } else {
              this.setTagNameErrText = "";
              return true;
            }
          }
          this.setTagNameErrText = `标签${Jl.c.cannotBeEmpty}`;
        },
        commUseAddTags: function (t) {
          var e = this.labelClassifyData.commonLabel;
          var n = e.labelData || [];
          var a = n.find(function (e) {
            return e === t;
          });
          if (a) {
            return G.a.warning("标签已存在");
          }
          xu.changeTagsCommonStatus(t);
          this.isShowCommUseAddLabelTooltip = false;
          G.a.success("添加成功");
        },
        createTagsAndAddToGroup: function () {
          var t = this;
          if (this.showCreate == 0 && this.find.length) {
            return this.labelGroupAddTags(this.find[0]);
          }
          if (this.checkTagNameIsOk()) {
            this.setLabelGroupNameErrText = "";
            this.isShowAddTagToGroupErrText = false;
            xu.addNewTags(this.findText);
            this.tagsVal = JSON.parse(JSON.stringify(this.findText));
            this.addGroupHandle([this.recordAddLabelGroupIndex]);
            this.$nextTick(function () {
              t.copyLabelGroupData[t.recordAddLabelGroupIndex].showGTooltip = false;
              t.recordAddLabelGroupIndex = "";
            });
          } else {
            this.isShowAddTagToGroupErrText = true;
          }
        },
        labelGroupAddTags: function (t) {
          var e = this;
          if (t != "") {
            this.tagsVal = t;
            this.addGroupHandle([this.recordAddLabelGroupIndex]);
            this.$nextTick(function () {
              e.copyLabelGroupData[e.recordAddLabelGroupIndex].showGTooltip = false;
              e.recordAddLabelGroupIndex = "";
            });
          }
        },
        addCommUseLabel: function () {
          this.isShowCommUseAddLabelTooltip = true;
          this.findText = "";
          this.find = [];
        },
        handleShowAddGroup: function () {
          var t = this;
          this.newGroupName = "";
          this.isShowAddGroup = true;
          this.setLabelGroupNameErrText = "";
          this.$nextTick(function () {
            var e = t.$refs.labelGroupRef.$el.scrollHeight;
            t.$refs.labelGroupRef.$el.scrollTop = e;
          });
        },
        createTagsGroup: function () {
          var t = this;
          if (this.checkTagGroupNameIsOk()) {
            xu.createTagsGroup(this.newGroupName);
            this.newGroupName = "";
            this.isShowAddGroup = false;
            G.a.success("新增成功");
            this.$nextTick(function () {
              t.copyLabelGroupData = JSON.parse(JSON.stringify(t.data.group));
            });
          }
        },
        checkTagGroupNameIsOk: function () {
          if (this.newGroupName && this.newGroupName.trim()) {
            if (this.newGroupName.length > Jl.c.limitCharCount) {
              this.setLabelGroupNameErrText = Jl.c.limitCharCountTipText;
              return false;
            } else {
              this.setLabelGroupNameErrText = "";
              return true;
            }
          } else {
            this.setLabelGroupNameErrText = `分组名称${Jl.c.cannotBeEmpty}`;
            return false;
          }
        },
        addGroupInputBlur: function () {
          this.isShowAddGroup = false;
          this.newGroupName = "";
        },
        renameGroupInputBlur: function () {
          this.renameGroupIndex = "";
          this.newGroupName = "";
        },
        objSort: function (t) {
          var e = [];
          var n = {};
          var a = [];
          for (var i in t) {
            e.push(i);
          }
          e.sort();
          e.filter(function (e, i) {
            if (isNaN(parseInt(e))) {
              n[e] = t[e];
            } else {
              a.push.apply(a, Object(ct.a)(t[e]));
            }
            return false;
          });
          if (a.length > 0) {
            n["#"] = a;
          }
          return n;
        },
        classification: function (t) {
          var e = {};
          t.filter(function (t, n) {
            var a = gu(t)[0];
            if (e.hasOwnProperty(a)) {
              e[a].push(t);
            } else {
              e[a] = [t];
            }
            return false;
          });
          return e;
        },
        addGroupHandle: function (t) {
          this.showAddGroup = false;
          xu.addTagsToGroup(t, this.tagsVal);
          G.a.success("添加成功");
        },
        removeToGroupHandle: function (t) {
          xu.addTagsToGroup(t, this.tagsVal);
          xu.removeTagsByGroup(this.groupIndex, this.tagsVal);
          G.a.success("移动成功");
        },
        groupLabelRightKey: function (t, e, n, a) {
          this.groupIndex = a;
          this.showMenu(t, e, n);
        },
        showMenu: function (t, e, n) {
          var a = this;
          this.currentLabel = e;
          var i = xu.getTagsCommonStatus(e);
          var r = [{
            text: "查看包含标签的模板",
            callback: function (t, n) {
              a.$temp.viewIncludedTags(e);
              a.$emit("filterListByTag", e);
            }
          }, {
            text: "fg"
          }, {
            text: i ? "取消常用标签" : "设为常用标签",
            callback: function () {
              var t = Object(d.a)(regeneratorRuntime.mark(function t(n, i) {
                return regeneratorRuntime.wrap(function (t) {
                  while (1) {
                    switch (t.prev = t.next) {
                      case 0:
                        xu.changeTagsCommonStatus(e);
                        a.$tips.show("设置成功");
                      case 2:
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
            text: n ? "从分组中移除" : "添加到分组...",
            callback: function () {
              var t = Object(d.a)(regeneratorRuntime.mark(function t(i, r) {
                return regeneratorRuntime.wrap(function (t) {
                  while (1) {
                    switch (t.prev = t.next) {
                      case 0:
                        if (n) {
                          t.next = 4;
                          break;
                        }
                        a.showAddGroup = true;
                        a.tagsVal = e;
                        return t.abrupt("return");
                      case 4:
                        xu.removeTagsByGroup(a.groupIndex, e);
                        a.groupIndex = -1;
                      case 6:
                      case "end":
                        return t.stop();
                    }
                  }
                }, t);
              }));
              function i(e, n) {
                return t.apply(this, arguments);
              }
              return i;
            }()
          }, {
            text: "fg"
          }, {
            text: "重命名",
            callback: function () {
              var t = Object(d.a)(regeneratorRuntime.mark(function t(n, i) {
                return regeneratorRuntime.wrap(function (t) {
                  while (1) {
                    switch (t.prev = t.next) {
                      case 0:
                        a.$inputBox.show(function (t) {
                          if (t != e) {
                            if (t.length > Jl.c.limitCharCount) {
                              var n = Jl.c.limitCharCountTipText;
                              a.$inputBox.update({
                                err: n
                              });
                            } else {
                              var i = xu.renameTags(e, t);
                              a.$tips.show(i == "" ? "修改成功" : i);
                            }
                          }
                        }, "重命名", e);
                      case 1:
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
            text: "删除标签",
            callback: function () {
              var t = Object(d.a)(regeneratorRuntime.mark(function t(n, i) {
                return regeneratorRuntime.wrap(function (t) {
                  while (1) {
                    switch (t.prev = t.next) {
                      case 0:
                        a.$msg.confirm("删除标签", "确定要删除标签？", function () {
                          var t = xu.deleteTagsAndAllId(e);
                          a.$tips.show(t == "" ? "删除成功" : t);
                        });
                      case 1:
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
          if (this.groupIstrue) {
            var s = {
              text: "移动到分组",
              callback: function () {
                var t = Object(d.a)(regeneratorRuntime.mark(function t(n, i) {
                  return regeneratorRuntime.wrap(function (t) {
                    while (1) {
                      switch (t.prev = t.next) {
                        case 0:
                          a.isShowRemoveTagsToGroupDialog = true;
                          a.tagsVal = e;
                        case 2:
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
            };
            var o = r.findIndex(function (t) {
              return t.text === "从分组中移除";
            });
            r.splice(o, 1, s);
          }
          this.$menu.show(r, true, t);
        },
        renameGroup: function (t) {
          var e = this;
          if (t.name !== this.newGroupName) {
            if (this.checkTagGroupNameIsOk()) {
              xu.renameTagsGrpup(this.renameGroupIndex, this.newGroupName);
              this.$nextTick(function () {
                e.newGroupName = "";
                e.renameGroupIndex = "";
              });
            }
          } else {
            this.renameGroupIndex = "";
          }
        },
        showAddLabelToGroupDialog: function (t) {
          this.recordAddLabelGroupIndex = t;
          this.findText = "";
          this.find = [];
          this.copyLabelGroupData[t].showGTooltip = true;
          this.copyLabelGroupData.forEach(function (e, n) {
            if (t !== n) {
              e.showGTooltip = false;
            }
          });
        },
        deleteGroup: function (t) {
          this.isShowDeleteGroupDialog = true;
          this.isDeleteGroupAndLabel = false;
          this.recordDeleteGroupIndex = t;
        },
        cancelDeleteGroup: function () {
          this.isShowDeleteGroupDialog = false;
        },
        confirmDeleteGroup: function () {
          var t = this;
          if (this.isDeleteGroupAndLabel) {
            var e = this.data.group[this.recordDeleteGroupIndex];
            var n = e.data;
            if (n.length) {
              n.forEach(function (e) {
                xu.deleteTagsAndAllId(e);
                for (var n = t.data.group, a = 0; a < n.length; a++) {
                  if (a !== t.recordDeleteGroupIndex) {
                    var i = n[a].data.findIndex(function (t) {
                      return t === e;
                    });
                    if (i > -1) {
                      xu.removeTagsByGroup(a, e);
                    }
                  }
                }
              });
            }
          }
          xu.deleteGroup(this.recordDeleteGroupIndex);
          this.recordDeleteGroupIndex = "";
          this.cancelDeleteGroup();
          G.a.success("删除成功");
          this.$nextTick(function () {
            t.copyLabelGroupData = JSON.parse(JSON.stringify(t.data.group));
          });
        },
        showGroupMenu: function (t, e, n) {
          var a = this;
          var i = [{
            text: "重命名",
            callback: function () {
              var t = Object(d.a)(regeneratorRuntime.mark(function t(i, r) {
                return regeneratorRuntime.wrap(function (t) {
                  while (1) {
                    switch (t.prev = t.next) {
                      case 0:
                        a.newGroupName = JSON.parse(JSON.stringify(e.name));
                        a.renameGroupIndex = n;
                        a.setLabelGroupNameErrText = "";
                      case 3:
                      case "end":
                        return t.stop();
                    }
                  }
                }, t);
              }));
              function i(e, n) {
                return t.apply(this, arguments);
              }
              return i;
            }()
          }, {
            text: "删除",
            callback: function (t, e) {
              a.deleteGroup(n);
            }
          }];
          this.$menu.show(i, true, t);
        }
      }
    }