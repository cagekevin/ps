{
      components: {
        IconFont: ie.a,
        templateLabel: Bd
      },
      data: function () {
        return {};
      },
      created: function () {
        xu.initTagsData();
      },
      methods: {
        backIconClick: function () {
          this.$emit("toggleTagPanelVisible", false);
        },
        filterListByTag: function (t) {
          this.$emit("filterListByTag", t);
        }
      }
    }