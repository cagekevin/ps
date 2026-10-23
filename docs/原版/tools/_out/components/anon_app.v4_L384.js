{
      props: {
        data: Array,
        showIcon: {
          type: Boolean,
          default: true
        },
        x: {
          type: String,
          default: ""
        },
        y: {
          type: String,
          default: ""
        }
      },
      data: function () {
        return {
          showMenu: false
        };
      },
      watch: {},
      created: function () {},
      methods: {
        handle: function (t, e) {
          var n = this;
          if (this.data[t].show !== true) {
            this.showMenu = false;
          }
          setTimeout(function () {
            if (typeof n.data[t].callback === "function") {
              n.data[t].callback(t, n.data[t]);
            }
          }, 10);
        },
        show: function () {
          this.showMenu = true;
        },
        hide: function () {
          this.showMenu = false;
        },
        getStatus: function () {
          return this.showMenu;
        }
      }
    }