# add-template

> 来源：`app/56d7.js`　大小：0.9KB
> 特征：props / data / methods

## 子组件

`GDropdown`、`GMenu`、`GMenuItem`、`LongPress`、`AddTemplateIcon`、`Icon`、`GTooltip`

## props（1）

`addToTemplateMode`

## methods（4）

`addTemplate`、`runCacheOperation`、`showMenu`、`hideMenu`

## 源码

```js
{
  name: "add-template",
  components: {
    GDropdown: ii.a,
    GMenu: ai.a,
    GMenuItem: ai.a.Item,
    LongPress: xh,
    AddTemplateIcon: Th,
    Icon: ie.a,
    GTooltip: jo.a
  },
  props: {
    addToTemplateMode: {
      type: String,
      required: true
    }
  },
  data: function () {
    return {
      visible: false,
      TEMPLATE: Ih
    };
  },
  watch: {
    visible: {
      handler: function (t) {
        if (t) {
          document.addEventListener("click", this.hideMenu);
        } else {
          document.removeEventListener("click", this.hideMenu);
        }
      },
      immediate: true
    }
  },
  methods: {
    addTemplate: function (t) {
      this.$emit(t);
    },
    runCacheOperation: function () {
      this.addTemplate(Ih[this.addToTemplateMode].value);
    },
    showMenu: function () {
      this.visible = true;
    },
    hideMenu: function () {
      this.visible = false;
    }
  }
}
```