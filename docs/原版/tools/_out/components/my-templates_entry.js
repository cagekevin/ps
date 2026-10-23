{
      name: "my-templates_entry",
      components: {
        LibLayout: sc,
        LibTopNav: dc,
        TemplateOwn: od,
        PersonalTemplateMenu: yd,
        LabelManegePanel: Ud
      },
      props: {
        switchIndex: {
          type: Number,
          required: true
        }
      },
      computed: {
        centerMenuShow: function () {
          var t;
          var e;
          return this.$store.state.showMenu === ((t = this.$refs) === null || t === undefined || (e = t.personaTemplateMenu) === null || e === undefined ? undefined : e.condition);
        }
      },
      data: function () {
        return {
          isShowLabelManegePanel: false,
          navList: Gd
        };
      },
      methods: {
        setSwitchIndex: function (t) {
          this.$emit("setSwitchIndex", t);
        },
        dropOpen: function () {
          this.$refs.personaTemplateMenu.open();
        },
        importFolder: function () {
          this.$refs.personaTemplateMenu.$emit("importFolder");
        },
        importPack: function () {
          this.$refs.personaTemplateMenu.$emit("importPack");
        },
        createNewTemplate: function () {
          this.$refs.personaTemplateMenu.$emit("createNewTemplate");
        },
        openTemplate: function () {
          this.$refs.personaTemplateMenu.$emit("openTemplate");
        },
        updataPreview: function () {
          var t = this;
          setTimeout(function () {
            t.$refs.templateOwn.$emit("toggleLibrary");
          }, 300);
        },
        toggleTagPanelVisible: function (t) {
          this.isShowLabelManegePanel = t;
        },
        filterListByTag: function (t) {
          this.isShowLabelManegePanel = false;
          eu.showTagsAllView(t);
        }
      }
    }