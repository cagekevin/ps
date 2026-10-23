# childre

> 来源：`app/0425.js`　大小：1.4KB
> 特征：props / data / methods

## props（1）

`data`

## computed（5）

`moveFreeLayoutIndex`、`freeLayoutIndex`、`istrue`、`width`、`height`

## methods（4）

`selectId`、`move`、`leav`、`highlight`

## 源码

```js
{
  name: "childre",
  props: {
    data: null
  },
  data: function () {
    return {
      istrues: this.data.type == "row",
      widths: "calc( (100% - " + (this.data.children.length - 1) * 5 + "px)/" + this.data.children.length + " )",
      heights: "calc( (100% - " + (this.data.children.length - 1) * 5 + "px)/" + this.data.children.length + " )"
    };
  },
  computed: {
    moveFreeLayoutIndex: function () {
      return wt.a.state.moveFreeLayoutIndex;
    },
    freeLayoutIndex: function () {
      return wt.a.state.freeLayoutIndex;
    },
    istrue: function () {
      return this.data.type == "row";
    },
    width: function () {
      return "calc( (100% - " + (this.data.children.length - 1) * 2 + "px)/" + this.data.children.length + " )";
    },
    height: function () {
      return "calc( (100% - " + (this.data.children.length - 1) * 2 + "px)/" + this.data.children.length + " )";
    }
  },
  created: function () {
    console.log(this.data, 123);
  },
  methods: {
    selectId: function (t) {
      this.$emit("selectId", t);
    },
    move: function (t) {
      if (t == wt.a.state.freeLayoutIndex) {
        wt.a.state.moveFreeLayoutIndex = -1;
      } else {
        wt.a.state.moveFreeLayoutIndex = t;
      }
    },
    leav: function () {
      wt.a.state.moveFreeLayoutIndex = -1;
    },
    highlight: function (t) {
      wt.a.state.freeLayoutIndex = t;
      this.$emit("selectId", t);
    }
  }
}
```