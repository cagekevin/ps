# font-manage-rating

> 来源：`app/56d7.js`　大小：0.6KB
> 特征：props / data / methods

## 子组件

`Icon`

## props（2）

`nums`、`selected`

## methods（3）

`enter`、`leave`、`rating`

## 源码

```js
{
  name: "font-manage-rating",
  components: {
    Icon: Jt.a
  },
  props: {
    nums: {
      type: Number,
      default: 3
    },
    selected: {
      type: Number,
      default: 0
    }
  },
  data: function () {
    return {
      score: 0
    };
  },
  mounted: function () {
    var t = this;
    this.$nextTick(function () {
      t.score = t.selected;
    });
  },
  methods: {
    enter: function (t) {
      this.score = t;
    },
    leave: function () {
      this.score = this.selected;
    },
    rating: function (t) {
      this.$emit("rating", t);
    }
  }
}
```