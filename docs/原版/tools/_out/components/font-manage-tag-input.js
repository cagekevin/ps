{
      name: "font-manage-tag-input",
      components: {
        Icon: Jt.a,
        Input: Qg.a,
        Button: Xx.a
      },
      props: {
        showTag: {
          type: Boolean,
          default: true
        }
      },
      data: function () {
        return {
          added: false,
          text: ""
        };
      },
      methods: {
        onkeydown: function (t) {
          if (t.key === "Enter" || t.code === "Enter") {
            this.$emit("add-user-tag", this.text);
          }
        },
        oninput: function () {
          this.text = this.text.slice(0, 8);
          this.added = false;
          this.$emit("set-text", this.text);
        },
        clearText: function () {
          this.text = "";
        },
        addTag: function () {
          var t = this;
          this.$emit("add-user-tag", this.text);
          requestAnimationFrame(function () {
            return t.added = true;
          });
        }
      }
    }