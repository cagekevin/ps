{
      components: {
        IconFont: ie.a
      },
      props: {
        disabled: {
          type: Boolean,
          default: false
        }
      },
      data: function () {
        return {
          condition: Math.floor(Math.random() * 10000000)
        };
      },
      methods: {
        reload: function () {
          if (!this.disabled) {
            this.$emit("reload");
          }
        },
        jumpToAuthRecord: function () {
          if (!this.disabled) {
            Ca.jumpToAuthRecord();
          }
        },
        open: function () {
          this.$store.state.showMenu = this.$store.state.showMenu == this.condition ? -1 : this.condition;
        }
      }
    }