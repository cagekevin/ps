# TopicCarousel

> 来源：`app/56d7.js`　大小：0.3KB
> 特征：props / data / methods

## 子组件

`GCarousel`、`Icon`

## props（1）

`topics`

## methods（1）

`beforeChange`

## 源码

```js
{
  name: "TopicCarousel",
  components: {
    GCarousel: tf.a,
    Icon: Jt.a
  },
  props: {
    topics: {
      default: function () {
        return [];
      },
      type: Array
    }
  },
  data: function () {
    return {
      curIndex: 0
    };
  },
  methods: {
    beforeChange: function (t, e) {
      this.curIndex = e;
    }
  }
}
```