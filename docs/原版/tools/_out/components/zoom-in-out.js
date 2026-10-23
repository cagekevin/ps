{
      name: "zoom-in-out",
      components: {
        GSlider: oi.a,
        Icon: ie.a
      },
      props: {
        columns: {
          type: Number,
          required: true
        },
        disabled: {
          type: Boolean,
          default: false
        }
      },
      data: function () {
        return {
          sliderValue: 0
        };
      },
      created: function () {
        this.syncSliderValue(this.columns);
      },
      methods: {
        zoomout: function () {
          if (!(this.columns >= li)) {
            var t = this.columns + 1;
            this.$emit("change", t);
            this.syncSliderValue(t);
          }
        },
        zoomin: function () {
          if (!(this.columns <= ci)) {
            var t = this.columns - 1;
            this.$emit("change", t);
            this.syncSliderValue(t);
          }
        },
        handleSliderChange: function (t) {
          var e = Math.max(Math.ceil(t / ui), ci) - 1;
          var n = li - e;
          this.$emit("change", n);
          this.sliderValue = t;
        },
        syncSliderValue: function (t) {
          var e = li - t;
          this.sliderValue = e * ui;
        }
      }
    }