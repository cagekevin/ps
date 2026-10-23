{
      components: {
        GButton: Wt.a,
        Icon: ie.a,
        Empty: sl
      },
      methods: {
        importFolder: function () {
          this.$emit("importFolder");
        },
        importPack: function () {
          this.$emit("importPack");
        }
      }
    }