# download-list-panel

> 来源：`app/56d7.js`　大小：0.9KB
> 特征：props / data / methods

## 子组件

`DownloadList`、`Toolbar`、`Question`

## props（1）

`list`

## computed（3）

`total`、`canContinueTaskList`、`canPauseTaskList`

## methods（3）

`startSelected`、`pauseSelected`、`removeSelected`

## 源码

```js
{
  name: "download-list-panel",
  components: {
    DownloadList: os,
    Toolbar: fs,
    Question: ws
  },
  props: {
    list: {
      type: Array,
      require: true
    }
  },
  data: function () {
    return {
      columns: 2,
      selected: 0
    };
  },
  computed: {
    total: function () {
      return this.list.length;
    },
    canContinueTaskList: function () {
      return this.list.filter(function (t) {
        return t.status === he.A.Pausing || t.status === he.A.Error;
      });
    },
    canPauseTaskList: function () {
      return this.list.filter(function (t) {
        return t.status === he.A.Downloading || t.status === he.A.Waiting;
      });
    }
  },
  methods: {
    startSelected: function () {
      Ca.batchContinueTask(this.canContinueTaskList);
    },
    pauseSelected: function () {
      Ca.batchPauseTask(this.canPauseTaskList);
    },
    removeSelected: function () {
      Ca.batchRemoveTask(this.list);
    }
  }
}
```