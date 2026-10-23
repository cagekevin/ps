{
      props: {
        value: {
          type: Boolean,
          default: true
        }
      },
      methods: {
        clickHandle: function () {
          this.$emit("input", !this.value);
          this.$emit("change", !this.value);
        }
      }
    }