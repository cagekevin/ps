# select-box

> 来源：`app/56d7.js`　大小：0.6KB
> 特征：props / data / methods

## props（1）

`options`

## computed（1）

`currentLabel`

## methods（2）

`toggle`、`choose`

## 源码

```js
{
  name: "select-box",
  components: {
    "gd-icon": Jt.a
  },
  props: {
    options: {
      type: Array,
      required: true
    }
  },
  data: function () {
    return {
      visibility: false,
      current: 0
    };
  },
  computed: {
    currentLabel: function () {
      return (this.options[this.current] || {
        label: ""
      }).label;
    }
  },
  methods: {
    toggle: function (t) {
      this.visibility = t;
      this.$emit("toggle", t);
    },
    choose: function (t) {
      this.current = t;
      this.toggle(false);
      this.$emit("choose", t);
    }
  }
}
```