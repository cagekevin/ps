{
      components: {
        CepModal: Yt
      },
      data: function () {
        return {};
      },
      methods: {
        okClick: function () {
          this.$router.push({
            name: "Set",
            query: {
              callback: "showClearCacheDialog"
            }
          });
          this.$emit("handleIsShowNoMemeryDialog", false);
        }
      }
    }