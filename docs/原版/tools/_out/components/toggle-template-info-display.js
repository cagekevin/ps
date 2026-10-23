{
      name: "toggle-template-info-display",
      components: {
        GDropdown: ii.a,
        GMenu: ai.a,
        GMenuItem: ai.a.Item,
        Icon: ie.a,
        GCheckbox: cu.a
      },
      props: {
        showName: {
          type: Boolean,
          default: true
        },
        showSize: {
          type: Boolean
        }
      },
      data: function () {
        return {};
      },
      methods: {
        toggleNameShow: function () {
          this.$emit("toggleNameShow");
        },
        togglePsdSizeShow: function () {
          this.$emit("togglePsdSizeShow");
        }
      }
    }