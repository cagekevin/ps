{
      data: function () {
        return {
          isShow: false,
          max: 100,
          num: 20,
          text: "同步文件",
          successText: "同步成功"
        };
      },
      watch: {
        progressNum: function () {
          if (this.progressNum == 100) {
            this.delayHide();
          }
        }
      },
      computed: {
        progressNum: function () {
          var t = this.num / this.max * 100;
          if (t >= 100) {
            return 100;
          } else {
            return t;
          }
        }
      },
      created: function () {
        this.successText = "同步成功";
      },
      methods: {
        show: function (t, e, n) {
          this.isShow = true;
          if (typeof e == "text") {
            return false;
          }
          this.text = t;
          this.num = e;
          this.max = n;
        },
        hide: function () {
          this.isShow = false;
        },
        delayHide: function () {
          var t = this;
          var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 2800;
          setTimeout(function () {
            t.hide();
          }, e);
        },
        showSuccess: function (t) {
          this.isShow = true;
          this.successText = t;
          this.num = 100;
          this.max = 100;
          this.delayHide();
        }
      }
    }