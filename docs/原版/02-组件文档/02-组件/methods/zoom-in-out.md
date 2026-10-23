# zoom-in-out · 方法实现

> 来源：`zoom-in-out.js`
> 方法数：4

## `zoomout`


```js
function () {
      if (!(this.columns >= li)) {
        var t = this.columns + 1;
        this.$emit("change", t);
        this.syncSliderValue(t);
      }
    }
```

## `zoomin`


```js
function () {
      if (!(this.columns <= ci)) {
        var t = this.columns - 1;
        this.$emit("change", t);
        this.syncSliderValue(t);
      }
    }
```

## `handleSliderChange`

参数：`t`

```js
function (t) {
      var e = Math.max(Math.ceil(t / ui), ci) - 1;
      var n = li - e;
      this.$emit("change", n);
      this.sliderValue = t;
    }
```

## `syncSliderValue`

参数：`t`

```js
function (t) {
      var e = li - t;
      this.sliderValue = e * ui;
    }
```
