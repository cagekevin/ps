{
      name: "font-manage-filter-preview",
      components: {
        Icon: Jt.a,
        TagGroup: bb,
        Badge: rb.a
      },
      props: {
        tags: {
          type: Array,
          required: true
        },
        count: {
          type: Number,
          default: 0
        }
      },
      methods: {
        closeTag: function (t) {
          this.$emit("remove-tag-filter", t);
        },
        toggleFilterPanel: function () {
          var t = this.$refs["filter-preview-header"].getBoundingClientRect();
          var e = t.bottom;
          this.$emit("toggle-filter-panel", {
            right: 8,
            top: e + 5
          });
        }
      }
    }