# version-switcher

> 来源：`app/56d7.js`　大小：2.3KB
> 特征：props / data / methods

## props（5）

`hasOffset`、`version`、`time`、`showVersionSwitcher`、`switchTo`

## methods（4）

`changeVersion`、`switchVersion`、`confirm`、`cancel`

## 文案（5）

提示 · 将会重新进入插件 · 是否继续 · 切换版本失败 · 请稍后尝试

## 源码

```js
{
  name: "version-switcher",
  components: {
    "gd-switch": yT.a,
    "gd-button": Wt.a,
    "cep-modal": Yt
  },
  props: {
    hasOffset: {
      type: Boolean,
      default: false
    },
    version: {
      type: String,
      required: true
    },
    time: {
      type: String,
      required: true
    },
    showVersionSwitcher: {
      type: Boolean,
      required: true
    },
    switchTo: {
      type: Function,
      required: true
    }
  },
  data: function () {
    this.vsm = new CT(this.version, this.time);
    var t = this.vsm.checkVersionType();
    var e = this.vsm.getActionDisplayValue();
    var n = this.vsm.getVersionDisplayValue();
    return {
      title: "提示",
      tip: `${e}${n}将会重新进入插件，是否继续？`,
      checked: t,
      open: false,
      waiting: false,
      currentVersionType: this.vsm.getVersionType(),
      displayVersionType: n
    };
  },
  methods: {
    changeVersion: function () {
      this.switchVersion(!this.checked);
    },
    switchVersion: function (t) {
      this.checked = t;
      this.open = !this.open;
    },
    confirm: function () {
      var t = this;
      return Object(d.a)(regeneratorRuntime.mark(function e() {
        var n;
        return regeneratorRuntime.wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                if (!t.waiting) {
                  e.next = 2;
                  break;
                }
                return e.abrupt("return");
              case 2:
                t.waiting = true;
                n = t.vsm.switchToVersionType(t.currentVersionType);
                e.prev = 4;
                e.next = 7;
                return t.switchTo(n);
              case 7:
                t.waiting = false;
                t.open = false;
                e.next = 17;
                break;
              case 11:
                e.prev = 11;
                e.t0 = e.catch(4);
                console.error("switch version failed: ", e.t0);
                G.a.warning("切换版本失败，请稍后尝试");
                t.waiting = false;
                t.open = false;
              case 17:
              case "end":
                return e.stop();
            }
          }
        }, e, null, [[4, 11]]);
      }))();
    },
    cancel: function () {
      this.changeVersion();
    }
  }
}
```