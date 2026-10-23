# select-button

> 来源：`app/56d7.js`　大小：0.2KB
> 特征：props / data

## 子组件

`Button`

## props（2）

`selected`、`size`

## 源码

```js
{
  name: "select-button",
  components: {
    Button: Wt.a
  },
  props: {
    selected: {
      type: Boolean,
      default: false
    },
    size: {
      type: String,
      default: "small"
    }
  },
  data: function () {
    return {};
  }
}
```