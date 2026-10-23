{
      name: "user-font-page-drawer",
      components: {
        FilterPanel: Kk
      },
      computed: {
        tagCategories: function () {
          return Rw.tagCategories;
        }
      },
      methods: {
        toggleTagFilter: function (t) {
          t.index;
          var e = t.selected;
          var n = Object(Vn.a)(t, Yk);
          if (e) {
            Rw.addTagFilter(n);
          } else {
            Rw.removeTagFilter(n);
          }
          Rw.toggleTagCategory(Object(P.a)(Object(P.a)({}, n), {}, {
            selected: e
          }));
          Rw.resetPage();
          f.a.info({
            msg: "FONT_MANAGE_TOGGLE_TAG_FILTER"
          });
        },
        cleanCategoryFilter: function (t) {
          Rw.removeCategoryTagFilter({
            category: t
          });
          Rw.removeWholeTagCategory({
            category: t
          });
          Rw.resetPage();
          f.a.info({
            msg: "FONT_MANAGE_RESET_TAG_FILTER"
          });
        }
      }
    }