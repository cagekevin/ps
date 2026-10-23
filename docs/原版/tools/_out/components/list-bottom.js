{
      name: "list-bottom",
      components: {
        Icon: ie.a,
        Dropdown: ii.a,
        Menu: ai.a,
        MenuItem: ai.a.Item,
        ZoomInOut: pi
      },
      props: {
        sortOptions: {
          type: Array,
          default: function () {
            return [];
          }
        },
        columns: {
          type: Number,
          required: true
        },
        sort: {
          type: String,
          required: true
        },
        disabled: {
          type: Boolean,
          default: false
        }
      },
      methods: {
        handleSort: function (t) {
          if (!this.disabled) {
            this.$emit("handleSort", t);
          }
        },
        handleColumnChange: function (t) {
          if (!this.disabled) {
            this.$emit("handleColumnChange", t);
          }
        }
      }
    }