# font-manage-list-font-preview

> 来源：`app/56d7.js`　大小：0.8KB
> 特征：props / methods

## props（5）

`fontFamily`、`previewText`、`previewMode`、`displayName`、`language`

## computed（2）

`showText`、`classes`

## methods（1）

`getDefaultText`

## 文案（1）

设计助理

## 源码

```js
{
  name: "font-manage-list-font-preview",
  props: {
    fontFamily: {
      type: [String, Number],
      default: 500
    },
    previewText: {
      type: String,
      default: ""
    },
    previewMode: {
      type: String,
      default: xg[0].mode
    },
    displayName: {
      type: String,
      required: true
    },
    language: {
      type: String,
      default: "cn"
    }
  },
  computed: {
    showText: function () {
      return this.previewText || this.getDefaultText(this.language);
    },
    classes: function () {
      return `font-manage__list-item__preview--${this.previewMode}`;
    }
  },
  methods: {
    getDefaultText: function (t) {
      if (t === "en") {
        return "Crazy Design";
      } else {
        return "设计助理";
      }
    }
  }
}
```