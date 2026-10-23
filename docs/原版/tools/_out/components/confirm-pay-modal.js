{
      name: "confirm-pay-modal",
      components: {
        CepModal: Yt
      },
      props: {
        visible: {
          type: Boolean,
          default: false
        },
        confirmLoading: {
          type: Boolean,
          default: false
        }
      },
      data: function () {
        return {};
      },
      methods: {
        ok: function () {
          this.$emit("ok");
        },
        close: function () {
          this.$emit("close");
        }
      }
    }