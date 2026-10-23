{
      data: function () {
        return {
          mode: 1,
          width: ""
        };
      },
      computed: {},
      methods: {
        fpSpacingDistribution: function (t) {
          if (Object(ft.f)()) {
            this.$freePanelBox.show("分布元素", "cy_distributedByPitch", [t, this.width, this.mode]);
          }
        },
        checkUnit: function () {
          if (this.width.indexOf("=") == -1) {
            this.width = Object(ft.b)(this.width);
          }
        },
        handle: function (t) {
          this.$cep.jsxHistory("cy_distributedByPitch", [t, this.width, this.mode], "按间距分布");
        }
      },
      mounted: function () {}
    }