{
      props: {
        text: {
          type: String,
          default: "显示更多"
        },
        value: {
          type: Boolean,
          default: false
        }
      },
      methods: {
        contextmenu: function (t) {
          var e = {
            event: t,
            val: !this.value,
            ctrl: Object(me.f)(),
            shift: Object(me.g)()
          };
          this.$emit("menu", e);
        },
        clickHandle: function (t) {
          var e = {
            event: t,
            val: !this.value,
            ctrl: Object(me.f)(),
            shift: Object(me.g)()
          };
          this.$emit("change", e);
        }
      }
    }