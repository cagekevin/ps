{
      components: {
        layout: Et
      },
      props: {
        isShow: {
          type: Boolean,
          default: false
        },
        option: {
          type: Object,
          default: function () {
            return {};
          }
        },
        err: {
          type: String,
          default: ""
        },
        content: {
          type: String,
          default: ""
        },
        batch: {
          type: Boolean,
          default: false
        }
      },
      data: function () {
        return {
          value: "",
          focus: false,
          id: -1
        };
      },
      methods: {
        updataId: function (t) {
          this.id = t;
        },
        cancel: function () {
          this.reset();
        },
        ok: function () {
          var t = this;
          if (this.id == -1) {
            return this.$tips.show("请选择区域");
          }
          if (this.batch) {
            var e = [];
            function n(t, e, n) {
              if (typeof t == "undefined" || typeof t[e] == "undefined") {
                return n;
              } else {
                return t[e];
              }
            }
            try {
              for (var a = 0; a < this.option.key.length; a++) {
                var i = {
                  key: this.option.key[a],
                  text: this.option.text[a],
                  option: n(this.option.option, a, null),
                  icon: n(this.option.icon, a, ""),
                  type: n(this.option.type, a, ""),
                  id: this.id
                };
                e.push(i);
              }
            } catch (s) {
              alert(s);
            }
            this.option = e;
          } else {
            var r = this.value.replace(/\s*/g, "");
            if (r == "") {
              this.err = "*不能为空哦";
              return;
            }
            this.option.text = this.value;
            this.option.id = this.id;
          }
          this.$cep.sendAppEvent("com.fengzi.event.freePanel.add", this.option);
          setTimeout(function () {
            t.$tips.show("发送成功");
            var e = t.$sync.getFileName(t.$config.path.appFreePanel);
            t.$appBus.emit("syncChangeFileToServe", "syncFreePanel", [e], "自由面板");
          }, 100);
          this.reset();
        },
        show: function () {
          var t = this;
          if (typeof this.content != "string") {
            this.content = this.content.toString();
          }
          this.value = this.content;
          this.isShow = true;
          setTimeout(function () {
            t.$refs.inputbox.focus();
          }, 200);
        },
        reset: function () {
          this.value = "";
          this.err = "";
          this.content = "";
          this.isShow = false;
          this.option = {};
          this.batch = false;
        },
        select: function (t) {
          setTimeout(function () {
            if (t.target.value != "") {
              t.target.select();
            }
          }, 100);
        }
      }
    }