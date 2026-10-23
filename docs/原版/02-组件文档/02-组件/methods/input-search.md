# input-search · 方法实现

> 来源：`input-search.js`
> 方法数：2

## `onChange`

参数：`t`

```js
function (t) {
      this.stateValue = t.target.value;
      if (!t.target.value.trim()) {
        this.$refs.input.focus();
      }
      if (t && t.target && t.type === "click") {
        this.$emit("search", t.target.value, t);
      }
      this.$emit("change", t);
    }
```

## `onSearch`

参数：`t`

```js
function (t) {
      if (!this.disabled) {
        this.$emit("search", this.$refs.input.stateValue, t);
      }
    }
```
