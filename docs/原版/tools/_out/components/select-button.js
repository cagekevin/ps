{
      name: "select-button",
      components: {
        Button: Wt.a
      },
      props: {
        selected: {
          type: Boolean,
          default: false
        },
        size: {
          type: String,
          default: "small"
        }
      },
      data: function () {
        return {};
      }
    }