# app

> 来源：`app/56d7.js`　大小：2.3KB
> 特征：props / data / methods

## props（3）

`value`、`pageSize`、`total`

## computed（2）

`dataval`、`cenChange`

## methods（4）

`adjustmentPage`、`curr`、`prev`、`next`

## 源码

```js
{
  props: {
    value: null,
    pageSize: {
      type: null,
      default: 0
    },
    total: {
      type: null,
      default: 0
    }
  },
  name: "app",
  components: {},
  data: function () {
    return {
      arr: [1, 2, 3],
      cen: this.value,
      page: null
    };
  },
  created: function () {},
  computed: {
    dataval: function () {
      var t = Math.ceil(this.total / this.pageSize);
      return t;
    },
    cenChange: {
      get: function () {
        return this.value;
      },
      set: function (t) {
        this.$emit("input", t);
      }
    }
  },
  watch: {
    total: {
      immediate: true,
      handler: function () {
        this.adjustmentPage();
      }
    },
    pageSize: {
      immediate: true,
      handler: function () {
        this.adjustmentPage();
      }
    }
  },
  methods: {
    adjustmentPage: function () {
      this.arr = [1, 2, 3];
      var t = Math.ceil(this.total / this.pageSize);
      if (t <= this.arr.length) {
        var e;
        var n = this.arr.filter(function (e, n) {
          return e <= t;
        });
        (e = this.arr).splice.apply(e, [0, this.arr.length].concat(Object(ct.a)(n)));
      } else {
        var a;
        (a = this.arr).splice.apply(a, [0, this.arr.length].concat([1, 2, 3]));
      }
    },
    curr: function (t, e) {
      var n = this;
      this.cen = this.arr[t];
      this.cenChange = this.arr[t];
      var a = t - Math.floor(this.arr.length / 2);
      if (e != null) {
        if (e < 1) {
          e = 1;
        }
        if (e > this.dataval) {
          e = this.dataval;
        }
        this.cen = e;
        this.cenChange = e;
        a = e - this.arr[Math.floor(this.arr.length / 2)];
      }
      if (this.arr[0] + a <= 0) {
        this.arr.map(function (t, e) {
          n.arr.splice(e, 1, e + 1);
        });
      } else if (this.arr[this.arr.length - 1] + a >= this.dataval) {
        this.arr.map(function (t, e) {
          n.arr.splice(e, 1, n.dataval - n.arr.length + e + 1);
        });
      } else {
        this.arr.map(function (t, e) {
          n.arr.splice(e, 1, t + a);
        });
      }
    },
    prev: function () {
      this.curr(null, this.cen - 1);
    },
    next: function () {
      this.curr(null, this.cen + 1);
    }
  },
  mounted: function () {}
}
```