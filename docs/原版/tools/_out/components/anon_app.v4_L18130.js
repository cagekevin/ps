{
      components: {
        IconFont: ie.a
      },
      data: function () {
        return {
          condition: Math.floor(Math.random() * 10000000)
        };
      },
      methods: {
        reload: function () {
          this.$emit("reload");
        },
        jumpToAuthRecord: function () {
          Ca.jumpToAuthRecord();
        },
        open: function () {
          this.$store.state.showMenu = this.$store.state.showMenu == this.condition ? -1 : this.condition;
        }
      }
    }