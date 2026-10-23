{
      name: "download-management",
      components: {
        DownloadProgressBtn: Yi,
        DownloadListPanel: _s
      },
      data: function () {
        return {
          visible: false
        };
      },
      created: function () {
        var t = this;
        as = function (e) {
          var n = t.$refs["download-management"];
          if (!n || !n.contains(e.target)) {
            t.visible = false;
          }
        };
        window.addEventListener("click", as);
      },
      beforeDestroy: function () {
        window.removeEventListener("click", as);
      },
      computed: {
        list: function () {
          return Ca.list.filter(function (t) {
            return t.type === "template" && !!t.preview;
          });
        },
        totalDownloadProgress: function () {
          return Ca.totalDownloadProgress;
        }
      }
    }