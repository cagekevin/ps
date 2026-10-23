{
      name: "Template",
      components: {
        TemplateCenterMenu: Da,
        TemplateCenter: tc,
        LibLayout: sc,
        LibTopNav: dc,
        MyTemplatesEntry: qd,
        Preview: Oc,
        TopicBanner: lf
      },
      data: function () {
        return {
          switchIndex: 0,
          navList: df,
          collapse: false,
          scrollTop: 0
        };
      },
      computed: {
        centerMenuShow: function () {
          var t;
          var e;
          return this.$store.state.showMenu === ((t = this.$refs) === null || t === undefined || (e = t.templateCenterMenu) === null || e === undefined ? undefined : e.condition);
        },
        previewInfo: function () {
          return this.$store.state.templateCenter.previewInfo;
        }
      },
      activated: function () {
        this.setPageViewTracker(this.switchIndex);
      },
      methods: {
        closePreview: function () {
          this.$store.commit("setPreviewInfo", null);
        },
        setPageViewTracker: function (t) {
          var e = ["self", "center"][t] || "self";
          Rt.a.pageView({
            page: `pszhuli-cep-main/template/${e}`
          });
        },
        setSwitchIndex: function (t) {
          this.switchIndex = t;
          this.setPageViewTracker(t);
          this.$bp.add("mb_00" + t);
        },
        dropOpen: function () {
          this.$refs.templateCenterMenu.open();
        },
        reloadTemplateCenter: function () {
          this.$refs["template-center"].$emit("reloadList");
        },
        onScrollList: hf()(function (t) {
          if (this.scrollTop >= t.scrollTop && t.scrollTop < 5) {
            this.collapse = false;
          } else {
            this.collapse = true;
          }
          this.scrollTop = t.scrollTop;
        }, 100, {
          leading: true
        })
      }
    }