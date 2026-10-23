{
      name: "font-manage-filter-panel",
      components: {
        Tag: fb,
        TagGroup: bb
      },
      props: {
        tagCategories: {
          type: Object,
          required: true
        }
      },
      methods: {
        toggleTagFilter: function (t) {
          this.$emit("toggle-tag-filter", t);
        },
        cleanCategoryFilter: function (t) {
          this.$emit("clean-category-filter", t);
        }
      }
    }