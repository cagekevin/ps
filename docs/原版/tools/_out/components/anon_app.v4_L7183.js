{
      props: {
        image: {
          type: String,
          default: ""
        },
        title: {
          type: String,
          required: true
        },
        content: {
          type: String,
          required: true
        },
        confirmBtnText: {
          type: String,
          default: ""
        },
        confirmBtnStyle: {
          type: Object,
          default: function () {
            return {
              color: "#FFFFFF",
              "background-color": "#3565FF"
            };
          }
        },
        cancelBtnText: {
          type: String,
          default: ""
        },
        cancelBtnStyle: {
          type: Object,
          default: function () {
            return {
              color: "#2C2C2C",
              "background-color": "#EAEAEA"
            };
          }
        },
        mask: {
          type: Boolean,
          default: true
        },
        maskClickClosable: {
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