{
      name: "user-font-page-dialog",
      components: {
        CepModal: Yt,
        GInput: Qg.a
      },
      props: {
        type: {
          type: String
        }
      },
      data: function () {
        return {
          inputVal: ""
        };
      },
      computed: {
        context: function () {
          switch (this.type) {
            case "remove":
              return iC;
            case "rename":
              return rC;
            default:
              return null;
          }
        }
      },
      methods: {
        confirm: function () {
          this.$emit(`confirm-${this.type}`, {
            value: this.inputVal
          });
        },
        cancel: function () {
          this.$emit(`cancel-${this.type}`);
        }
      }
    }