# file · 方法实现

> 来源：`file_2.js`
> 方法数：3

## `open`


```js
function () {
      this.$refs.test.open();
    }
```

## `top`

参数：`t`

```js
function (t) {
      this.data1Index = t;
      this.$emit("topFun", this.data1[t]);
    }
```

## `bottom`

参数：`t`

```js
function (t) {
      this.data2Index = t;
      this.$emit("bottomFun", this.data2[t]);
    }
```
