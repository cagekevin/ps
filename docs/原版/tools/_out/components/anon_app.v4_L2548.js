{
      props: {
        label: null,
        value: null
      },
      methods: {
        clickHandle: function () {
          this.$emit("input", this.label);
          this.$emit("change", this.label);
        }
      }
    }