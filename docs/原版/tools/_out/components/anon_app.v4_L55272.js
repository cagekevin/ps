{
      props: {
        firstSvg: null,
        secondSvg: null,
        Tips: null,
        title: {
          type: String,
          default: ""
        },
        secondTitle: {
          type: String,
          default: ""
        },
        firstSvgFun: {
          type: null,
          default: function () {}
        },
        secondSvgFun: {
          type: null,
          default: function () {}
        },
        isRota: {
          type: Boolean,
          default: true
        }
      },
      data: function () {
        return {};
      },
      methods: {
        firstFun: function () {
          console.log(this.rota);
          this.$emit("firstSvgFun", this.rota == 0);
        },
        secondFun: function () {
          this.$emit("secondSvgFun");
        }
      },
      mounted: function () {},
      computed: {
        rota: function () {
          if (this.isRota) {
            return 0;
          } else {
            return -90;
          }
        }
      },
      watch: {
        isRota: function () {}
      }
    }