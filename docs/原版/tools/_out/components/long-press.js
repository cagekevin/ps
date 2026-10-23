{
      name: "long-press",
      data: function () {
        return {
          isMouseDown: false,
          timer: null,
          hasFiredLongPress: false
        };
      },
      methods: {
        handleMousedown: function () {
          var t = this;
          this.isMouseDown = true;
          this.timer = setTimeout(function () {
            if (t.isMouseDown) {
              t.hasFiredLongPress = true;
              t.$emit("longPress");
            }
          }, 300);
        },
        handleMouseup: function () {
          clearTimeout(this.timer);
          this.isMouseDown = false;
        },
        handleClick: function (t) {
          if (this.hasFiredLongPress) {
            this.hasFiredLongPress = false;
            t.stopPropagation();
            return;
          }
          this.$emit("click");
        }
      }
    }