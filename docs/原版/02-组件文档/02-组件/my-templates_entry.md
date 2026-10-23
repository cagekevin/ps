# my-templates_entry

> 来源：`app/56d7.js`　大小：1.5KB
> 特征：props / data / methods

## 子组件

`LibLayout`、`LibTopNav`、`TemplateOwn`、`PersonalTemplateMenu`、`LabelManegePanel`

## props（1）

`switchIndex`

## computed（1）

`centerMenuShow`

## methods（10）

`setSwitchIndex`、`dropOpen`、`importFolder`、`importPack`、`createNewTemplate`、`openTemplate`、`updataPreview`、`toggleTagPanelVisible`、`filterListByTag`、`setTimeout`

## 源码

```js
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
```