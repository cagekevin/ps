{
      name: "TopicCarousel",
      components: {
        GCarousel: tf.a,
        Icon: Jt.a
      },
      props: {
        topics: {
          default: function () {
            return [];
          },
          type: Array
        }
      },
      data: function () {
        return {
          curIndex: 0
        };
      },
      methods: {
        beforeChange: function (t, e) {
          this.curIndex = e;
        }
      }
    }