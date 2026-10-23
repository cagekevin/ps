{
      name: "font-manage-rating",
      components: {
        Icon: Jt.a
      },
      props: {
        nums: {
          type: Number,
          default: 3
        },
        selected: {
          type: Number,
          default: 0
        }
      },
      data: function () {
        return {
          score: 0
        };
      },
      mounted: function () {
        var t = this;
        this.$nextTick(function () {
          t.score = t.selected;
        });
      },
      methods: {
        enter: function (t) {
          this.score = t;
        },
        leave: function () {
          this.score = this.selected;
        },
        rating: function (t) {
          this.$emit("rating", t);
        }
      }
    }