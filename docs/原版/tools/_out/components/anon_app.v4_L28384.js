{
      props: {
        select: Array
      },
      components: {
        TagsButton: Vl,
        InputSearch: Xa,
        SelectButton: Oi
      },
      data: function () {
        return {
          data: xu,
          added: [],
          find: [],
          findText: "",
          errText: "",
          isShowErrText: false
        };
      },
      computed: Object(P.a)(Object(P.a)({}, Object(mu.d)({
        tagsData: function (t) {
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
        },
        commonTags: function () {
          return Object(ne.get)(this.tagsData, "commonLabel.labelData") || [];
        },
        groupTags: function () {
          return Object(ne.get)(this.tagsData, "labelGroup.labelData") || [];
        }
      }),
      watch: {
        findText: function () {
          if (!this.findText && !this.findText.trim() || this.checkFindTextIsOk()) {
            this.isShowErrText = false;
          }
        }
      },
      created: function () {
        this.added = this.$temp.getTags(this.select);
      },
      methods: {
        close: function () {
          this.$emit("close");
        },
        openLabelManage: function () {
          this.$emit("toggleTagPanelVisible", true);
          this.$emit("close");
        },
        onChange: function () {
          this.find = xu.findTags(this.findText);
        },
        createTags: function () {
          if (this.showCreate == 0) {
            return this.addTags(this.find[0]);
          } else if (this.findText && this.findText.trim()) {
            if (this.checkFindTextIsOk()) {
              this.errText = "";
              this.isShowErrText = false;
              xu.addNewTags(this.findText);
              if (this.addTags(this.findText)) {
                this.find.push(this.findText);
              }
            } else {
              this.isShowErrText = true;
            }
            return;
          } else {
            this.errText = `标签${Jl.c.cannotBeEmpty}`;
            this.isShowErrText = true;
            return;
          }
        },
        checkFindTextIsOk: function () {
          return !(this.findText.length > Jl.c.limitCharCount) || (this.errText = Jl.c.limitCharCountTipText, false);
        },
        addTags: function (t) {
          if (t != "") {
            var e = this.added.indexOf(t);
            if (e != -1) {
              this.$tips.show("该标签已经添加了");
              return false;
            } else {
              this.$temp.addFileIdToTags(this.select, t);
              this.added = this.$temp.getTags(this.select);
              return true;
            }
          }
        },
        removeTags: function (t) {
          this.$temp.removeTagsFileId(this.select, t);
          var e = this.added.indexOf(t);
          if (e != -1) {
            this.added.splice(e, 1);
          }
        }
      }
    }