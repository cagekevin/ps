{
      name: "font-manage-preview-text",
      components: {
        Input: Qg.a,
        Button: Xx.a,
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
      watch: {
        defaultText: function (t) {
          this.text = t;
        }
      },
      methods: {
        onkeydown: function (t) {
          if (t.key === "Enter" || t.code === "Enter") {
            this.useText();
          }
        },
        useText: function () {
          if (this.text) {
            this.$emit("use-text", this.text);
          }
        },
        previewText: function () {
          this.$emit("set-preview-text", this.text);
        }
      }
    }