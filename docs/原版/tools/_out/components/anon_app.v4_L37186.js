{
      data: function () {
        return {
          width: "",
          open: false
        };
      },
      watch: {
        open: function (t) {
          this.setEvent();
        }
      },
      methods: {
        fpGuidFunc: function (t) {
          if (Object(ft.f)()) {
            this.$freePanelBox.show(t == 1 ? "清除参考线" : "基于参考线切片", "cy_clearCutGuide", t);
          }
        },
        fpUseGuide: function () {
          if (Object(ft.f)()) {
            if (this.width == "") {
              return this.$tips.show("请输入宽度");
            }
            this.$freePanelBox.show("生成安全区", "cy_useGride", this.width);
          }
        },
        setEvent: function () {
          this.$psEvent.set(this.open, "1936028772", "cySmartReferenceLine", this.smartReferenceLine);
          if (this.open) {
            this.$cep.jsxNoCheck("Tool_set", ["marqueeSingleRowTool"]);
          }
        },
        smartReferenceLine: function (t) {
          this.$cep.jsxHistoryNoCheck("cy_smartReferenceLine", [t], "智能参考线");
        },
        chenckWidth: function () {
          this.width = Object(ft.b)(this.width);
        },
        useGuide: function () {
          if (this.width == "") {
            return this.$tips.show("请输入宽度");
          }
          this.$cep.jsxHistoryNoCheck("cy_createSafeAreaGuide", [this.width], "生成安全区域参考线");
        },
        guidFunc: function (t) {
          this.$cep.jsxNoCheck("cy_guideFunction", [t]);
        }
      },
      mounted: function () {}
    }