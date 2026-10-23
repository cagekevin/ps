{
      name: "lib-layout",
      props: {
        menuActive: {
          type: Boolean,
          default: false
        },
        disabled: {
          type: Boolean,
          default: false
        }
      },
      components: {
        Icon: ie.a
      },
      methods: {
        dropOpen: function () {
          if (!this.disabled) {
            this.$emit("dropOpen");
          }
        }
      }
    }