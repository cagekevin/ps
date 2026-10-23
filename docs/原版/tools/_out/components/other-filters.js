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
        formatOptions: {
          type: Array,
          default: function () {
            return [];
          }
        },
        ratios: {
          type: String,
          required: true
        },
        colors: {
          type: String | Number,
          required: true
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
        },
        filterFormat: function (t) {
          this.$emit("filterFormat", t);
        }
      }
    }