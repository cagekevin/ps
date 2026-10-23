{
      props: {
        title: {
          type: String,
          default: "标题"
        },
        text: {
          type: String,
          default: "收藏成功"
        },
        time: {
          type: Number,
          default: 1000
        }
      },
      data: function () {
        return {
          isShowMessageBox: false
        };
      },
      methods: {
        show: function () {
          var t = this;
          this.isShowMessageBox = true;
          setTimeout(function () {
            t.isShowMessageBox = false;
          }, this.time);
        }
      }
    }