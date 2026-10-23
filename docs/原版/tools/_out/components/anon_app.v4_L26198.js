{
      components: {
        Icon: ie.a
      },
      props: {
        num: {
          type: null,
          default: 3
        },
        select: {
          type: null,
          default: 0
        }
      },
      data: function () {
        return {};
      },
      methods: {
        change: function (t) {
          this.$emit("select", t);
        }
      }
    }