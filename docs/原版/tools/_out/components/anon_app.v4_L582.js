{
      props: {
        isShow: {
          type: Boolean,
          default: false
        },
        title: {
          type: String,
          default: "请输入名字"
        },
        content: {
          type: String,
          default: "默认值"
        },
        err: {
          type: String,
          default: ""
        },
        okCallBack: {
          type: Function,
          default: null
        }
      },
      components: {
        GInput: b.a,
        GButton: g.a,
        Icon: y.a
      },
      data: function () {
        return {
          value: "",
          focus: false
        };
      },
      methods: {
        cancel: function () {
          this.reset();
        },
        ok: function () {
          var t = this.value.replace(/\s*/g, "");
          if (t != "") {
            if (typeof this.okCallBack == "function") {
              this.okCallBack(this.value);
            }
            if (!this.err) {
              this.reset();
            }
          } else {
            this.err = "*不能为空哦";
          }
        },
        close: function () {
          this.reset();
        },
        show: function () {
          var t = this;
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