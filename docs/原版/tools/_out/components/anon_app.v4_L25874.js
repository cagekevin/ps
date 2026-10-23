{
      components: {
        GButton: Wt.a,
        Empty: sl
      },
      data: function () {
        return {
          path: ""
        };
      },
      created: function () {
        this.path = this.$temp.dir;
      },
      methods: {
        createNewTemplate: function () {
          this.$emit("createNewTemplate");
        },
        openTemplate: function () {
          this.$emit("openTemplate");
        }
      }
    }