{
      props: {
        align: {
          type: String,
          default: "right"
        },
        text: {
          type: String,
          default: "显示更多"
        },
        value: {
          type: Boolean,
          default: false
        },
        svgClass: {
          type: String,
          default: ""
        }
      },
      methods: {
        clickHandle: function () {
          this.$emit("input", !this.value);
          this.$emit("change", !this.value);
        }
      }
    }