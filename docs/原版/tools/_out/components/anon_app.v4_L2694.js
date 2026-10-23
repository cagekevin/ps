{
      props: {
        tips: {
          type: String,
          default: ""
        },
        disabled: {
          type: Boolean,
          default: false
        },
        type: {
          type: String,
          default: "text"
        },
        value: {},
        leftPadding: {
          type: String,
          default: "10px"
        },
        size: {
          type: String,
          default: "normal"
        },
        dark: {
          type: Boolean,
          default: false
        },
        whiteTheme: {
          type: Boolean,
          default: false
        },
        validate: {
          type: String,
          default: ""
        }
      },
      data: function () {
        return {
          isFocus: false,
          isSelect: false
        };
      },
      methods: {
        inputHandle: function (t) {
          this.$emit("input", t.target.value);
          this.$emit("change", this.value);
        },
        blurHandle: function () {
          this.isFocus = false;
          this.isSelect = false;
          if (this.validate == "number") {
            var t = this.value.replace(/[^\d.]/, "");
            if (t != this.value) {
              this.$emit("input", t);
              this.$emit("change", t);
            }
          }
          this.$emit("blur");
        },
        select: function (t) {
          if (!this.isSelect) {
            this.isSelect = true;
            if (t.currentTarget.value != "") {
              t.currentTarget.select();
            }
          }
        },
        focus: function () {
          this.$refs.refInput.focus();
        }
      }
    }