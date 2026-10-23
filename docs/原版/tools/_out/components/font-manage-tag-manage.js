{
      name: "font-manage-tag-manage",
      components: {
        TagCreator: Ik,
        TagLinker: Lk
      },
      props: {
        font: {
          type: Object,
          default: function () {
            return null;
          }
        },
        userTags: {
          type: Array,
          required: true
        },
        groups: {
          type: Object,
          default: function () {
            return {};
          }
        }
      },
      data: function () {
        return {
          beRemoved: null
        };
      },
      computed: {
        showFontLinker: function () {
          return !!this.font;
        }
      },
      methods: {
        addUserTag: function (t) {
          this.$emit("add-user-tag", t);
        },
        toggleFontTag: function (t) {
          this.$emit("filter-by-user-tag", t);
        },
        removeUserTagFromFont: function (t) {
          this.$emit("remove-user-tag-from-font", t);
        },
        addUserTagToFont: function (t) {
          this.$emit("add-user-tag-to-font", t);
        },
        filterByUserTag: function (t) {
          this.$emit("filter-by-user-tag", t);
        },
        removeUserTag: function (t) {
          this.$emit("remove-user-tag", t);
        },
        renameUserTag: function (t) {
          this.$emit("rename-user-tag", t);
        },
        cancelAddUserTag: function () {
          this.$emit("cancel-add-user-tag");
        }
      }
    }