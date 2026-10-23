{
      name: "font-manage-search",
      components: {
        Input: Qg.a,
        Icon: Jt.a
      },
      props: {
        defaultText: {
          type: String,
          default: ""
        }
      },
      data: function () {
        return {
          text: ""
        };
      },
      created: function () {
        this.text = this.defaultText;
      },
      methods: {
        search: function () {
          this.$emit("search", this.text);
        },
        clearText: function () {
          this.text = "";
          this.$emit("search", this.text);
        }
      }
    }