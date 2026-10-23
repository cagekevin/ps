{
      name: "lib-top-nav",
      props: {
        switchIndex: {
          type: Number,
          required: true
        },
        disabled: {
          type: Boolean,
          default: false
        },
        navList: {
          type: Array,
          required: true,
          validator: function (t) {
            return t.length > 0 && (t.forEach(function (t) {
              if (typeof t.index !== "number" || typeof t.name !== "string" || typeof t.title !== "string") {
                return false;
              }
            }), true);
          }
        }
      },
      methods: {
        setSwitchIndex: function (t) {
          if (!this.disabled) {
            this.$emit("setSwitchIndex", t);
          }
        }
      }
    }