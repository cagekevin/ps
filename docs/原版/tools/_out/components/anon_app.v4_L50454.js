{
      props: {
        data: {
          type: Object,
          default: {}
        },
        isShow: {
          type: Boolean,
          default: true
        },
        title: {
          type: String,
          default: "请选择仓库"
        }
      },
      data: function () {
        return {
          index: -1
        };
      },
      methods: {
        cancel: function () {
          this.$emit("close");
        },
        confirm: function () {
          if (this.index == -1) {
            return this.$tips.show("请选择仓库");
          }
          this.$emit("ok", this.index);
        }
      },
      watch: {
        isShow: function () {
          this.index = -1;
        }
      }
    }