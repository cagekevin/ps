# my-templates_entry · 方法实现

> 来源：`my-templates_entry.js`
> 方法数：10

## `setSwitchIndex`

参数：`t`

```js
function (t) {
      this.$emit("setSwitchIndex", t);
    }
```

## `dropOpen`


```js
function () {
      this.$refs.personaTemplateMenu.open();
    }
```

## `importFolder`


```js
function () {
      this.$refs.personaTemplateMenu.$emit("importFolder");
    }
```

## `importPack`


```js
function () {
      this.$refs.personaTemplateMenu.$emit("importPack");
    }
```

## `createNewTemplate`


```js
function () {
      this.$refs.personaTemplateMenu.$emit("createNewTemplate");
    }
```

## `openTemplate`


```js
function () {
      this.$refs.personaTemplateMenu.$emit("openTemplate");
    }
```

## `updataPreview`


```js
function () {
      var t = this;
      setTimeout(function () {
        t.$refs.templateOwn.$emit("toggleLibrary");
      }, 300);
    }
```

## `toggleTagPanelVisible`

参数：`t`

```js
function (t) {
      this.isShowLabelManegePanel = t;
    }
```

## `filterListByTag`

参数：`t`

```js
function (t) {
      this.isShowLabelManegePanel = false;
      eu.showTagsAllView(t);
    }
```

## `setTimeout`

参数：`function (`

```js
setTimeout(function () {
        t.$refs.templateOwn.$emit("toggleLibrary");
      }
```
