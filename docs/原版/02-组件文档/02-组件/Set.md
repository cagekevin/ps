# Set

> 来源：`app/56d7.js`　大小：0.3KB
> 特征：data / methods

## 子组件

`CepModal`

## methods（1）

`okClick`

## 源码

```js
{
  components: {
    CepModal: Yt
  },
  data: function () {
    return {};
  },
  methods: {
    okClick: function () {
      this.$router.push({
        name: "Set",
        query: {
          callback: "showClearCacheDialog"
        }
      });
      this.$emit("handleIsShowNoMemeryDialog", false);
    }
  }
}
```