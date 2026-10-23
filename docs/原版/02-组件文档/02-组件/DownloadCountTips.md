# DownloadCountTips

> 来源：`app/56d7.js`　大小：1.3KB
> 特征：props / data / methods

## 子组件

`GTooltip`

## computed（5）

`trialInfo`、`userEdition`、`userDownloadMaxCount`、`downloadCountTips`、`downloadCountText`

## methods（1）

`showTryLimitDialog`

## 文案（8）

您是 · 会员 · 每天可下载 · 次 · 同一模板 · 素材不重复计数 · 免费下载次数 · 今日下载次数

## 源码

```js
{
  name: "DownloadCountTips",
  components: {
    GTooltip: jo.a
  },
  props: {},
  data: function () {
    return {
      userService: zo
    };
  },
  created: function () {},
  computed: {
    trialInfo: function () {
      return this.$store.state.userDownloadCountInfo;
    },
    userEdition: function () {
      return Object(ne.get)(this.userService, "user.vipInfo.edition");
    },
    userDownloadMaxCount: function () {
      return this.trialInfo?.max_count;
    },
    downloadCountTips: function () {
      if (this.userEdition && this.userDownloadMaxCount) {
        return `您是${this.userEdition}会员, 每天可下载${this.userDownloadMaxCount}次, 同一模板/素材不重复计数`;
      } else {
        return "";
      }
    },
    downloadCountText: function () {
      if (this.trialInfo && this.trialInfo.vipInfo && this.trialInfo.vipInfo.isExpired === false) {
        if (this.trialInfo.vipInfo.vipType === "try") {
          return `免费下载次数 ${this.trialInfo.count}/${this.trialInfo.max_count}`;
        }
        if (this.trialInfo.vipInfo.vipType === "official") {
          return `今日下载次数 ${this.trialInfo.count}/${this.trialInfo.max_count}`;
        }
      }
      return "";
    }
  },
  methods: {
    showTryLimitDialog: function () {
      if (this.trialInfo.vipInfo.vipType === "try") {
        this.$emit("showTryLimitDialog");
      }
    }
  }
}
```