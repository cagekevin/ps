{
      name: "font-manage-header",
      components: {
        Icon: Jt.a,
        Search: nb,
        FilterPreview: kb
      },
      props: {
        searchText: {
          type: String,
          require: true
        },
        tagFilters: {
          type: Array,
          required: true
        },
        count: {
          type: Number,
          required: true
        },
        noFilter: {
          type: Boolean,
          required: true
        }
      },
      methods: {
        filterByText: function (t) {
          this.$emit("filter-by-text", t);
        },
        removeTagFilter: function (t) {
          this.$emit("remove-tag-filter", t);
        },
        toggleFilterPanel: function (t) {
          this.$emit("toggle-filter-panel", t);
        }
      }
    }