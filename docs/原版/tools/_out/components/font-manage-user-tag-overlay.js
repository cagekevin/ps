{
      name: "font-manage-user-tag-overlay",
      props: {
        closeOverlay: {
          type: Function,
          default: function () {}
        }
      },
      methods: {
        remove: function () {
          this.$emit("remove-tag");
          this.closeOverlay();
        },
        rename: function () {
          this.$emit("rename-tag");
          this.closeOverlay();
        }
      }
    }