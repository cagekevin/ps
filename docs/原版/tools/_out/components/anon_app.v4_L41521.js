{
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
        return {
          mouseindex: -1
        };
      },
      computed: {},
      methods: {
        change: function (t) {
          this.$emit("select", t);
        }
      },
      mounted: function () {}
    }