{
      props: {
        title: {
          type: String,
          default: "水平分布元素"
        },
        err: {
          type: String,
          default: ""
        }
      },
      data: function () {
        return {
          value: "",
          focus: false,
          istrue: false,
          set: V.a.info
        };
      },
      created: function () {
        var t = this;
        setTimeout(function () {
          t.$refs.inputBox.focus();
        }, 50);
      },
      methods: {
        cancel: function () {
          this.$emit("close");
        },
        ok: function () {
          if (this.value == "") {
            return this.err = "不能输入空字符";
          }
          if (this.value.indexOf("=") == -1 && this.value.indexOf(",") == -1) {
            this.value = Object(ft.b)(this.value);
          }
          this.$emit("ok", this.value, false);
          if (this.set.ztDistributedIsFixed == 0) {
            this.cancel();
          }
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