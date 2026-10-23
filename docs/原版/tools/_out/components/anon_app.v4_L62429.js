{
      props: {
        text: {
          type: String,
          default: "显示更多"
        },
        value: {
          type: Boolean,
          default: false
        }
      },
      data: function () {
        return {
          status: false
        };
      },
      created: function () {
        this.status = this.value;
      },
      methods: {
        clickHandle: function () {
          this.$emit("input", !this.value);
          this.$emit("change");
        }
      }
    }