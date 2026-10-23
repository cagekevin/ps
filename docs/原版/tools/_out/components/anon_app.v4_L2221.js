{
      props: {
        scrollColor: {
          type: null,
          default: "#515151"
        },
        isShow: {
          type: null,
          default: true
        },
        moveHidden: {
          type: null,
          default: false
        },
        scrollDisabled: {
          type: Boolean,
          default: false
        }
      },
      data: function () {
        return {
          only: "only" + Math.floor(Math.random() * 100000000),
          clientHeight: null,
          scrollHeight: null,
          scrollLeft: 0
        };
      },
      created: function () {
        var t = this;
        this.$nextTick(function () {
          document.styleSheets[0].addRule("." + t.only + "::-webkit-scrollbar-thumb", "background-color:" + t.scrollColor);
          if (!t.isShow) {
            document.styleSheets[0].addRule("." + t.only + "::-webkit-scrollbar-thumb", "display:none");
          }
        });
      },
      mounted: function () {
        this.clientHeight = this.$refs.vueScroll.clientHeight;
        this.scrollHeight = this.$refs.vueScroll.scrollHeight;
      },
      methods: {
        handlerBesideScroll: function (t) {
          if (t.target.scrollLeft !== this.scrollLeft) {
            this.scrollLeft = t.target.scrollLeft;
            this.$emit("scrollLeft", this.scrollLeft, t.target.clientWidth);
          }
        },
        test: function (t) {
          var e = this;
          t.preventDefault();
          if (!this.scrollDisabled) {
            var n = t.wheelDelta;
            var a = 0;
            if (!this.$refs.vueScroll) {
              return;
            }
            this.scrollHeight = this.$refs.vueScroll.scrollHeight;
            var i = this.$store.state.isMac;
            var r = i ? 9 : 10;
            var s = 3;
            var o = function t() {
              if (!(a >= r)) {
                if (n < 0) {
                  e.$refs.vueScroll.scrollTop += s;
                } else {
                  e.$refs.vueScroll.scrollTop -= s;
                }
                if (e.$refs.vueScroll.scrollTop < 0) {
                  e.$refs.vueScroll.scrollTop = 0;
                } else if (e.$refs.vueScroll.scrollTop > e.$refs.vueScroll.scrollHeight) {
                  e.$refs.vueScroll.scrollTop = e.$refs.vueScroll.scrollHeight;
                } else {
                  a++;
                  e.$emit("slide", {
                    clientHeight: e.$refs.vueScroll.clientHeight,
                    scrollHeight: e.$refs.vueScroll.scrollHeight,
                    scrollTop: e.$refs.vueScroll.scrollTop
                  });
                  window.requestAnimationFrame(t);
                }
              }
            };
            window.requestAnimationFrame(o);
          }
        },
        moveFun: function () {
          if (this.moveHidden) {
            document.styleSheets[0].addRule("." + this.only + "::-webkit-scrollbar-thumb", "display:block");
          }
        },
        leaveFun: function () {
          if (this.moveHidden) {
            document.styleSheets[0].addRule("." + this.only + "::-webkit-scrollbar-thumb", "display:none");
          }
        }
      }
    }