{
      name: "activate-modal",
      components: {
        CepModal: Yt,
        GInput: $a.a
      },
      props: {
        show: {
          type: Boolean,
          default: false
        },
        title: {
          type: String,
          default: "请输入名字"
        },
        err: {
          type: String,
          default: ""
        },
        confirmLoading: {
          type: Boolean,
          default: false
        }
      },
      data: function () {
        return {
          value: "",
          showErr: ""
        };
      },
      methods: {
        ok: function () {
          var t = this.value.replace(/\s*/g, "");
          if (t != "") {
            this.$emit("ok", this.value);
          } else {
            this.showErr = "激活码不能为空";
          }
        },
        cancel: function () {
          this.close();
          this.$emit("cancel");
        },
        close: function () {
          this.err = "";
          this.value = "";
          this.$emit("close");
        }
      },
      watch: {
        show: function () {
          var t = this;
          if (this.show === true) {
            this.value = "";
            this.showErr = "";
            setTimeout(function () {
              t.$refs.inputbox.focus();
            }, 100);
          }
        },
        err: function () {
          this.showErr = this.err;
        }
      }
    }