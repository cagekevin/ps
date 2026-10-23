{
      name: "font-manage-layouts-tabs",
      components: {
        Icon: Jt.a
      },
      props: {
        tabs: {
          type: Array,
          required: true
        }
      },
      data: function () {
        return {
          current: "",
          open: false,
          content: null,
          others: {}
        };
      },
      created: function () {
        var t = this;
        this.changeTab(0, false);
        Kv = function (e) {
          return t.closeMenuOutside(e);
        };
        window.addEventListener("click", Kv);
      },
      beforeDestroy: function () {
        window.removeEventListener("click", Kv);
      },
      methods: {
        changeTab: function (t) {
          var e = !(arguments.length > 1) || arguments[1] === undefined || arguments[1];
          var n = this.tabs[t] || {
            id: "",
            content: null,
            others: {}
          };
          var a = n.id;
          n.tab;
          var i = n.content;
          var r = Object(Vn.a)(n, hg);
          this.current = a;
          this.content = i;
          this.others = r;
          if (e) {
            this.$emit("change-tab", this.current);
          }
        },
        closeMenu: function () {
          this.toggleMenu();
        },
        closeMenuOutside: function (t) {
          if (this.open) {
            var e = this.$refs["tab-menu"];
            if (e && !e.contains(t.target)) {
              this.toggleMenu();
            }
          }
        },
        toggleMenu: function () {
          this.open = !this.open;
          this.$emit("toggle-menu", this.open);
        }
      }
    }