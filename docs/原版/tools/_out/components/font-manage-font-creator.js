{
      name: "font-manage-font-creator",
      components: {
        Icon: Jt.a,
        TagInput: _k,
        Button: Xx.a
      },
      data: function () {
        return {
          text: ""
        };
      },
      methods: {
        setText: function (t) {
          this.text = t;
        },
        addUserTag: function () {
          this.$emit("add-user-tag", {
            text: this.text,
            autoClose: true
          });
        },
        cancel: function () {
          var t = this;
          this.$emit("cancel-add-user-tag");
          requestAnimationFrame(function () {
            return t.text = "";
          });
        }
      }
    }