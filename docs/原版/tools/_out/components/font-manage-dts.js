{
      name: "font-manage-dts",
      components: {
        CepModal: Yt
      },
      props: {
        operateType: {
          type: String,
          required: true
        }
      },
      data: function () {
        return {
          okText: "继续"
        };
      },
      computed: {
        showModal: function () {
          return this.operateType === bg.Import || this.operateType === bg.Export;
        },
        title: function () {
          return yg[this.operateType];
        },
        tip: function () {
          return wg[this.operateType];
        }
      },
      methods: {
        confirm: function () {
          this.$emit("confirm");
        },
        cancel: function () {
          this.$emit("cancel");
        }
      }
    }