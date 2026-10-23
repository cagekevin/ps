{
      props: {
        text: {
          type: String,
          default: ""
        }
      },
      data: function () {
        return {
          isShow: false,
          colseNum: 0
        };
      },
      methods: {
        show: function () {
          this.isShow = true;
          this.colseNum = 0;
        },
        hide: function () {
          this.isShow = false;
          this.colseNum = 0;
        },
        close: function () {
          this.colseNum++;
          if (this.colseNum > 5) {
            this.hide();
          }
        }
      }
    }