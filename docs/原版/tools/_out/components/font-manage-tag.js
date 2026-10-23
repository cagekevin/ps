{
      name: "font-manage-tag",
      components: {
        Icon: Jt.a
      },
      props: {
        tag: {
          type: Object,
          required: true
        },
        closable: {
          type: Boolean,
          default: false
        },
        selectable: {
          type: Boolean,
          default: true
        }
      },
      methods: {
        openContextMenu: function (t) {
          this.$emit("open-context-menu", Object(P.a)(Object(P.a)({}, this.tag), {}, {
            event: {
              left: t.clientX + 5,
              top: t.clientY + 5
            }
          }));
        },
        toggle: function () {
          this.$emit("toggle-tag", Object(P.a)(Object(P.a)({}, this.tag), {}, {
            selected: !this.tag.selected
          }));
        },
        close: function () {
          this.$emit("close-tag", this.tag);
        }
      }
    }