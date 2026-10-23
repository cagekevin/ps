{
      props: {
        variableList: {
          type: Array,
          default: function () {
            return [];
          }
        },
        varibleValues: {
          type: Object,
          default: function () {
            return {};
          }
        },
        isInPopup: {
          type: Boolean,
          default: function () {
            return false;
          }
        }
      },
      components: {
        mySvg: fO
      },
      data: function () {
        return {
          selectLayerIds: []
        };
      },
      methods: {
        selectLayerVarible: function (t) {
          this.$cep.jsxNoCheck("Layer_onIdSelectLayer", [t.id]);
          if (this.isInPopup) {
            var e = this.selectLayerIds.indexOf(t.id);
            if (e > -1) {
              this.selectLayerIds.splice(e, 1);
            } else {
              this.selectLayerIds.push(t.id);
            }
          }
        },
        inputVaribleBlur: function (t = "", e) {
          var n = JSON.parse(JSON.stringify(this.varibleValues));
          delete n[e.id];
          var a = false;
          for (var i in n) {
            if (n[i] && n[i].trim() && t.trim() && n[i] === t) {
              G.a.error("变量名称已存在");
              a = true;
              break;
            }
          }
          if (!a && t.trim()) {
            e.name = t;
            if (!this.selectLayerIds.includes(e.id)) {
              this.selectLayerIds.push(e.id);
            }
          }
        },
        showTextMenu: function (t, e, n) {
          if (!this.isInPopup) {
            this.$emit("showTextMenu", t, e, n);
          }
        },
        dragColorWrap: function (t, e, n, a) {},
        dragColorWrapDrop: function (t) {
          this.moveEndIndex = t;
        }
      }
    }