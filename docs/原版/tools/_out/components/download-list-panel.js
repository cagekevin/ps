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