{
      components: {
        GButton: Wt.a,
        Icon: Jt.a
      },
      props: {
        title: {
          type: String,
          default: ""
        },
        closable: {
          type: Boolean,
          default: true
        },
        confirmLoading: {
          type: Boolean,
          default: false
        },
        cancelText: {
          type: String,
          default: "取消"
        },
        okText: {
          type: String,
          default: "确定"
        },
        maskClosable: {
          type: Boolean,
          default: true
        },
        hasOffset: {
          type: Boolean,
          default: false
        },
        footer: {
          type: Boolean,
          default: true
        },
        mask: {
          type: Boolean,
          default: true
        }
      },
      data: function () {
        return {};
      },
      methods: {
        cancel: function () {
          this.$emit("cancel");
        },
        ok: function () {
          this.$emit("ok");
        },
        handleMaskClick: function () {
          if (this.maskClosable) {
            this.cancel();
          }
        },
        handleModalContentClick: function () {
          this.$emit("handleModalContentClick");
        }
      }
    }