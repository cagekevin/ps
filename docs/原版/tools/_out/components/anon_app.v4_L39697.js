{
      props: {
        text: null
      },
      components: {
        dropDown: gm
      },
      data: function () {
        return {};
      },
      created: function () {},
      methods: {
        open: function () {
          this.$refs.hier.open();
        },
        ExtraLightFun: function (t) {
          this.$emit("change", t);
        },
        edie: function (t) {
          this.$emit("secondHandle", t);
        },
        deleteIndex: function (t) {
          this.$emit("therrHandle", t);
        }
      }
    }