{
      name: "user-font-page-header",
      components: {
        Header: Ob,
        UserTagFilter: Bb
      },
      computed: {
        searchText: function () {
          return Rw.searchText;
        },
        userTags: function () {
          return Rw.userTags;
        },
        tagFilters: function () {
          return Rw.tagFilters;
        },
        tagCategories: function () {
          return Rw.tagCategories;
        },
        total: function () {
          return Rw.total;
        },
        noFilter: function () {
          return this.tagFilters.length === 0 && !this.searchText && this.userTags.filter(function (t) {
            return t.selected;
          }).length === 0;
        }
      },
      methods: {
        filterByText: function (t) {
          Rw.searchText = t;
          Rw.resetPage();
        },
        filterByUserTag: function (t) {
          Rw.toggleUserTag(t);
          Rw.resetPage();
        },
        removeUserTag: function (t) {
          this.$emit("remove-user-tag", t);
        },
        renameUserTag: function (t) {
          this.$emit("rename-user-tag", t);
        },
        removeTagFilter: function (t) {
          Rw.removeTagFilter(t);
          Rw.toggleTagCategory(Object(P.a)(Object(P.a)({}, t), {}, {
            selected: false
          }));
        },
        toggleFilterPanel: function () {
          this.$emit("toggle-filter-panel");
        },
        toggleTagManage: function () {
          this.$emit("unset-current-font");
        }
      }
    }