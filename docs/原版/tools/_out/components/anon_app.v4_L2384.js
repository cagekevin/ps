{
      props: {
        name: String,
        select: {
          type: Boolean,
          default: false
        },
        height: {
          type: String,
          default: "26px"
        },
        width: {
          type: String,
          default: "26px"
        },
        svgWidth: {
          type: String,
          default: "16px"
        },
        svgClass: {
          type: String,
          default: ""
        }
      },
      methods: {
        menu: function (t) {
          this.$emit("menu", t);
        },
        clickHandle: function (t) {
          this.$emit("handle", t);
        }
      }
    }