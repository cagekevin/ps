# DLayout

> 来源：`app/56d7.js`　大小：1.5KB
> 特征：props / data / methods

## 子组件

`VirtualWaterfall`

## props（5）

`layoutMode`、`virtual`、`containerHeight`、`clientWidth`、`animated`

## computed（1）

`layout`

## methods（3）

`getClientHeight`、`handleScroll`、`loadMore`

## 源码

```js
{
  name: "DLayout",
  components: {
    VirtualWaterfall: mo
  },
  inheritAttrs: false,
  props: {
    layoutMode: {
      type: String,
      default: "waterfall"
    },
    virtual: {
      type: Boolean,
      default: false
    },
    containerHeight: {
      type: Number,
      default: 0
    },
    clientWidth: {
      type: Number,
      default: 0
    },
    animated: {
      type: Boolean,
      default: false
    }
  },
  emits: ["loadMore", "scroll"],
  data: function () {
    return {
      clientHeight: 0
    };
  },
  computed: {
    layout: function () {
      var t = this.layoutMode.replace(/\b[a-z]/g, function (t) {
        return t.toUpperCase();
      });
      if (this.virtual) {
        return "Virtual" + t;
      } else {
        return t;
      }
    }
  },
  watch: {
    containerHeight: function (t) {
      if (t > 0) {
        this.clientHeight = t;
      }
    }
  },
  mounted: function () {
    var t = this;
    this.$nextTick(function () {
      t.clientHeight = t.containerHeight || document.body.clientHeight;
      window.addEventListener("resize", t.getClientHeight);
    });
  },
  beforeDestroy: function () {
    window.removeEventListener("resize", this.getClientHeight);
  },
  methods: {
    getClientHeight: function () {
      this.clientHeight = this.containerHeight || document.body.clientHeight;
    },
    handleScroll: function (t) {
      this.$emit("scroll", t);
    },
    loadMore: function () {
      this.$emit("loadMore");
    }
  }
}
```