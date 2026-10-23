{
      props: {
        size: {
          type: String,
          default: "l"
        },
        speed: {
          type: String,
          default: "0KB/s"
        },
        fileSize: {
          type: String,
          default: "0 B"
        },
        progress: {
          type: Number,
          default: 0
        },
        columns: {
          type: Number,
          default: 2
        },
        taskStatus: {
          type: String,
          default: he.A.Waiting
        }
      },
      data: function () {
        return {
          isShort: false
        };
      },
      mounted: function () {
        var t = this;
        this.$nextTick(function () {
          var e = t.$parent && t.$parent.$el;
          if (e) {
            var n = t.$parent.$el.getBoundingClientRect();
            var a = n.height;
            t.isShort = a < 60;
          } else {
            t.isShort = false;
          }
        });
      },
      computed: {
        statusText: function () {
          switch (this.taskStatus) {
            case he.A.Waiting:
              return "等待中";
            case he.A.Pausing:
              return "暂停中";
            case he.A.Downloading:
              return this.speed || "0KB/s";
            case he.A.Done:
              return "下载完成";
            case he.A.Error:
              return "失败";
          }
        },
        isShowStatusText: function () {
          return !(this.columns > 3) && (this.size === "l" || this.size === "m");
        },
        isShowFileSize: function () {
          return !(this.columns > 2) && this.size === "l";
        },
        isShowDeleteBtn: function () {
          return this.isShowStatusText;
        }
      }
    }