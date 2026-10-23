{
      name: "other-filters",
      components: {
        FilterPopover: Ps,
        SelectButton: Oi
      },
      props: {
        colorOptions: {
          type: Array,
          default: function () {
            return [];
          }
        },
        colors: {
          type: String | Number,
          required: true
        },
        disabled: {
          type: Boolean,
          default: false
        }
      },
      data: function () {
        return {};
      },
      computed: {
        selectedNum: function () {
          var t = 0;
          if (this.colors) {
            t++;
          }
          if (this.ratios) {
            t++;
          }
          return t;
        }
      },
      methods: {
        filterColor: function (t) {
          this.$emit("filterColor", t);
        }
      }
    }