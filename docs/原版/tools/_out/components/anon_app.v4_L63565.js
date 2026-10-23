{
      props: {
        title: {
          type: String,
          default: "设计助理"
        },
        content: {
          type: String,
          default: ""
        },
        confirmBtnText: {
          type: String,
          default: ""
        },
        cancelBtnText: {
          type: String,
          default: ""
        },
        mask: {
          type: Boolean,
          default: true
        },
        maskClickClosable: {
          type: Boolean,
          default: true
        },
        exclamation: {
          type: Boolean,
          default: true
        },
        closable: {
          type: Boolean,
          default: true
        },
        dialogStyle: {
          type: String,
          default: ""
        },
        maskStyle: {
          type: String,
          default: ""
        }
      },
      data: function () {
        return {
          visible: true
        };
      },
      methods: {
        confirm: function () {
          this.visible = false;
          this.$emit("confirm");
        },
        cancel: function () {
          this.visible = false;
          this.$emit("cancel");
        },
        clickMask: function () {
          if (this.maskClickClosable) {
            this.visible = false;
            this.$emit("cancel");
          }
        }
      }
    }