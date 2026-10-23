# Template

> 来源：`app/56d7.js`　大小：2.0KB
> 特征：data / methods

## 子组件

`TopicBanner`、`MaterialCenterMenu`、`MaterialCenter`、`LibLayout`、`LibTopNav`、`Preview`

## computed（4）

`disableOtherActionsWhenDownloading`、`previewInfo`、`currentModule`、`centerMenuShow`

## methods（5）

`closePreview`、`setSwitchIndex`、`setPageViewTracker`、`dropOpen`、`reloadTemplateCenter`

## 源码

```js
{
  name: "Template",
  components: {
    TopicBanner: lf,
    MaterialCenterMenu: _f,
    MaterialCenter: Kf,
    LibLayout: sc,
    LibTopNav: dc,
    Preview: Oc
  },
  computed: {
    disableOtherActionsWhenDownloading: function () {
      return !!Ca.pendingUsingId;
    },
    previewInfo: function () {
      return this.$store.state.templateCenter.previewInfo;
    },
    currentModule: function () {
      return Yf[this.switchIndex];
    },
    centerMenuShow: function () {
      var t;
      var e;
      return this.$store.state.showMenu === ((t = this.$refs) === null || t === undefined || (e = t.templateCenterMenu) === null || e === undefined ? undefined : e.condition);
    }
  },
  data: function () {
    return {
      switchIndex: 0,
      navList: Yf,
      collapse: false,
      scrollTop: 0
    };
  },
  activated: function () {
    this.setPageViewTracker(this.switchIndex);
  },
  methods: {
    closePreview: function () {
      this.$store.commit("setPreviewInfo", null);
    },
    setSwitchIndex: function (t) {
      this.switchIndex = t;
      Yf[t].hasInited ||= true;
      this.setPageViewTracker(t);
      this.$bp.add("sc_00" + t);
    },
    setPageViewTracker: function (t) {
      var e = ["element", "picture", "icon"][t] || "element";
      Rt.a.pageView({
        page: `pszhuli-cep-main/material/${e}`
      });
    },
    dropOpen: function () {
      if (!this.disableOtherActionsWhenDownloading) {
        this.$refs.templateCenterMenu.open();
      }
    },
    reloadTemplateCenter: function () {
      if (this.$refs.materialCenter && this.$refs.materialCenter.length) {
        var t = this.$refs.materialCenter.find(function (t) {
          return t.visible;
        });
        if (t !== null && t !== undefined) {
          t.$emit("reloadList");
        }
      }
    },
    onScrollList: hf(function (t) {
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
```