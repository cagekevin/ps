{
      components: {
        GIcon: ie.a
      },
      props: {
        fileDropDown: {
          type: Boolean,
          default: false
        },
        tagsText: {
          type: String,
          default: ""
        },
        historyFolderRecords: {
          type: Array,
          default: function () {
            return [];
          }
        },
        pathName: {
          type: Function,
          default: function () {}
        }
      },
      data: function () {
        return {
          data: Ln.a
        };
      },
      methods: {
        openFolder: function (t) {
          this.$emit("openFolder", t);
        },
        openFolderForward: function () {
          this.$emit("openFolderForward");
        },
        dropOpen: function (t) {
          this.$emit("dropOpen", t);
        },
        clearRecycle: function () {
          var t = this;
          this.$msg.confirm("清空", "将清空全部文件，该操作不能撤销，确定继续？", Object(d.a)(regeneratorRuntime.mark(function e() {
            return regeneratorRuntime.wrap(function (e) {
              while (1) {
                switch (e.prev = e.next) {
                  case 0:
                    e.next = 2;
                    return Xc.clearRecycle(function (e, n) {
                      t.$load.show("正在清空回收站：" + e + "/" + n);
                    });
                  case 2:
                    t.$load.hide();
                    t.$emit("updataPreviewList");
                  case 4:
                  case "end":
                    return e.stop();
                }
              }
            }, e);
          })));
        },
        setShowChildrenBtn: function () {
          this.set.mbShowChildrenBtn = !this.set.mbShowChildrenBtn;
          this.$bp.add("mb_016");
        }
      }
    }