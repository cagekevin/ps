{
      name: "font-menu",
      components: {
        Icon: Jt.a
      },
      methods: {
        importFont: function () {
          this.setOptionType(bg.Import);
          this.closeMenu();
        },
        exportFont: function () {
          this.setOptionType(bg.Export);
          this.closeMenu();
        },
        disclaimer: function () {
          this.setOptionType(bg.Disclaimer);
          this.closeMenu();
        },
        setOptionType: function (t) {
          this.$emit("set-option-type", t);
        },
        closeMenu: function () {
          var t = this;
          setTimeout(function () {
            return t.$emit("close-menu");
          }, 20);
        }
      }
    }