{
      components: {
        fileChilder: Mu
      },
      props: {
        isAddTemplate: Boolean
      },
      data: function () {
        return {
          title: "",
          data: Ln.a,
          selectId: null
        };
      },
      watch: {
        selectALl: function () {
          var t;
          var e = Object(T.a)(this.data[this.checkval].children);
          try {
            for (e.s(); !(t = e.n()).done;) {
              var n = t.value;
              n.isAdd = this.selectALl;
            }
          } catch (a) {
            e.e(a);
          } finally {
            e.f();
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
                  t.selectId = t.isAddTemplate ? [] : null;
                  t.title = t.isAddTemplate ? "添加到文件夹" : "移动到文件夹";
                case 2:
                case "end":
                  return e.stop();
              }
            }
          }, e);
        }))();
      },
      methods: {
        ok: function () {
          if (!this.selectId || !this.selectId.length) {
            return this.$tips.show("请选择文件夹");
          }
          this.$emit("ok", this.selectId);
        },
        cancel: function () {
          this.$emit("close");
        },
        changeId: function (t) {
          if (this.isAddTemplate) {
            if (this.selectId.includes(t)) {
              var e = this.selectId.findIndex(function (e) {
                return e === t;
              });
              this.selectId.splice(e, 1);
            } else {
              this.selectId.push(t);
            }
          } else {
            this.selectId = t;
          }
        }
      }
    }