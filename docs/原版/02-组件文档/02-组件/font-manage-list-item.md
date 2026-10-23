# font-manage-list-item

> 来源：`app/56d7.js`　大小：0.7KB
> 特征：props / methods

## 子组件

`Icon`、`Rating`、`License`

## props（4）

`font`、`selectedFont`、`ratings`、`commercials`

## computed（1）

`rating`

## methods（3）

`selectFont`、`tagToFont`、`ratingToFont`

## 源码

```js
{
  name: "font-manage-list-item",
  components: {
    Icon: Jt.a,
    Rating: ox,
    License: fx
  },
  props: {
    font: {
      type: Object,
      required: true
    },
    selectedFont: {
      type: String,
      default: ""
    },
    ratings: {
      type: Object,
      required: true
    },
    commercials: {
      type: Object,
      required: true
    }
  },
  computed: {
    rating: function () {
      return this.ratings[this.font.family] || 0;
    }
  },
  methods: {
    selectFont: function () {
      this.$emit("select-font", this.font);
    },
    tagToFont: function () {
      this.$emit("tag-to-font", this.font);
    },
    ratingToFont: function (t) {
      this.$emit("rating-to-font", this.font, t);
    }
  }
}
```