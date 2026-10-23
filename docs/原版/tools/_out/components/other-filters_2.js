{
      name: "other-filters",
      components: {
        FilterPopover: lh
      },
      props: {
        selectedNum: {
          type: Number,
          default: 0
        },
        scoreOptions: {
          type: Array,
          required: true
        },
        timeOptions: {
          type: Array,
          required: true
        },
        time: {
          type: Array,
          required: true
        },
        scores: {
          type: Array,
          required: true
        },
        tags: {
          type: Array,
          required: true
        }
      },
      data: function () {
        return {
          isShowFilterManage: false
        };
      },
      computed: Object(P.a)({}, Object(mu.d)({
        tagsData: function (t) {
          return t.templateCenter.labelClassifyData;
        }
      })),
      methods: {
        filterTime: function (t) {
          this.$emit("filterTime", t);
        },
        filterScore: function (t) {
          this.$emit("filterScore", t);
        },
        filterTag: function (t) {
          console.log(t, "val");
          this.$emit("filterTag", t);
        },
        toggleFilterManageVisible: function () {
          this.isShowFilterManage = true;
          this.$emit("visibleChange", true);
        }
      }
    }