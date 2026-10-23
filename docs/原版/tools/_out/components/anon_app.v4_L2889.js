{
      props: {
        text: {
          type: String,
          default: "默认文本"
        },
        padding: {
          type: String,
          default: "10px"
        },
        height: {
          type: String,
          default: "24px"
        },
        whiteTheme: {
          type: Boolean,
          default: false
        },
        dark: {
          type: Boolean,
          default: false
        }
      },
      methods: {
        handle: function (t) {
          this.$emit("handle", t);
        }
      }
    }