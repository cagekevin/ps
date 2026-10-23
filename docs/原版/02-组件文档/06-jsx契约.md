# jsx 调用契约

> 来源：还原源码中所有 `jsx()` / `jsxNoCheck()` 调用
> 用途：自建面板时，按这些形态调用原厂 jsxbin
> 注意：函数体是 jsxbin 黑盒，此处只是**调用侧的参数形态**

共 68 个 PS 函数被调用过。

## `File_copy`

调用 3 处：

- `65bc.js:2033`　参数：`[v, x + b + k + "." + g]`
- `65bc.js:2237`　参数：`[s + m + ".png", n + "/" + v + ".png"]`
- `65bc.js:2240`　参数：`[s + m + ".psd", n + "/" + v + ".psd"]`

## `File_openImage`

调用 2 处：

- `anon_56d7_L28885.js:243`　无参数
- `56d7.js:29127`　无参数

## `Fs_copyFolder`

调用 6 处：

- `anon_56d7_L21871.js:1015`　参数：`[p, f]`
- `56d7.js:22885`　参数：`[p, f]`
- `65bc.js:773`　参数：`[m, v]`
- `65bc.js:947`　参数：`[a, i]`
- `65bc.js:1775`　参数：`[d, p]`
- `65bc.js:1877`　参数：`[k, _]`

## `Fs_deleteFolder`

调用 6 处：

- `anon_56d7_L21871.js:1018`　参数：`[p]`
- `56d7.js:9433`　参数：`[i]`
- `56d7.js:17649`　参数：`[Ln.a.path.recycle + "/" + r]`
- `56d7.js:17694`　参数：`[s]`
- `56d7.js:22888`　参数：`[p]`
- `65bc.js:776`　参数：`[m]`

## `Fs_openFolder`

调用 6 处：

- `anon_56d7_L21871.js:272`　参数：`[e]`
- `anon_56d7_L21871.js:297`　参数：`[i]`
- `anon_56d7_L23411.js:217`　参数：`[this.data.dir]`
- `anon_56d7_L23411.js:222`　参数：`[this.data.getDefaultFolderPath(`
- `anon_56d7_L56479.js:38`　参数：`[N.a.path.dirLog]`
- `anon_56d7_L56479.js:41`　参数：`[N.a.path.user]`

## `Fs_selectFolder`

调用 6 处：

- `anon_56d7_L21871.js:368`　无参数
- `anon_56d7_L21871.js:421`　无参数
- `anon_56d7_L23336.js:37`　无参数
- `anon_56d7_L23411.js:74`　无参数
- `anon_56d7_L23411.js:149`　无参数
- `anon_56d7_L23411.js:244`　无参数

## `Layer_getTypeNumber`

调用 1 处：

- `56d7.js:9994`　无参数

## `Layer_onIdSelectLayer`

调用 6 处：

- `anon_56d7_L52203.js:32`　参数：`[t.id]`
- `model.js:62`　参数：`[t.id]`
- `model.js:739`　参数：`[t.id]`
- `model.js:1279`　参数：`[this.variable.texts[t].id]`
- `model.js:1284`　参数：`[this.variable.images[t].id]`
- `Overprint.js:71`　参数：`[this.variable.texts[t].id]`

## `Layer_placedLayerRelinkToFile`

调用 2 处：

- `CommonUse.js:228`　参数：`[e]`
- `56d7.js:29825`　参数：`[e]`

## `Sys_setSystemEnvInfo`

调用 1 处：

- `56d7.js:9404`　参数：`[Object({                   VUE_APP_BASE_SERVER: "https://zhuli.gaoding.com",                   VUE_APP_WEBSITE_HOST: "h`

## `Tool_set`

调用 4 处：

- `anon_56d7_L29251.js:30`　参数：`["marqueeSingleRowTool"]`
- `anon_56d7_L42077.js:290`　参数：`["eyedropperTool"]`
- `56d7.js:29280`　参数：`["marqueeSingleRowTool"]`
- `56d7.js:42366`　参数：`["eyedropperTool"]`

## `cmm_setLayerColor`

调用 2 处：

- `rename.js:325`　参数：`[t]`
- `56d7.js:49285`　参数：`[t]`

## `cy_batchOptimizeDoc`

调用 2 处：

- `anon_56d7_L28057.js:49`　参数：`[a, n[i]], "优化文档"`
- `56d7.js:28105`　参数：`[a, n[i]], "优化文档"`

## `cy_changeStyleColor`

调用 2 处：

- `anon_56d7_L42077.js:139`　参数：`[t], "更改颜色"`
- `56d7.js:42215`　参数：`[t], "更改颜色"`

## `cy_getImagePath`

调用 2 处：

- `CommonUse.js:558`　无参数
- `56d7.js:30155`　无参数

## `cy_getPsdForFolder`

调用 5 处：

- `anon_56d7_L28057.js:34`　无参数
- `anon_56d7_L28885.js:141`　无参数
- `56d7.js:9184`　无参数
- `56d7.js:28090`　无参数
- `56d7.js:29025`　无参数

## `cy_guideFunction`

调用 2 处：

- `anon_56d7_L29251.js:46`　参数：`[t]`
- `56d7.js:29296`　参数：`[t]`

## `cy_openDirectory`

调用 4 处：

- `anon_56d7_L28885.js:201`　无参数
- `CommonUse.js:111`　无参数
- `56d7.js:29085`　无参数
- `56d7.js:29708`　无参数

## `cy_zoom`

调用 2 处：

- `CommonUse.js:612`　参数：`[t], "自由变换"`
- `56d7.js:30209`　参数：`[t], "自由变换"`

## `doc_openPsdAsDuplicate`

调用 1 处：

- `56d7.js:7288`　参数：`[a.filepath]`

## `dz_getActionList`

调用 2 处：

- `add.js:43`　无参数
- `56d7.js:47588`　无参数

## `exportCurrentLayerToImage`

调用 2 处：

- `Style.js:63`　无参数
- `56d7.js:46704`　无参数

## `f_getScriptEventId`

调用 1 处：

- `56d7.js:9840`　无参数

## `layer_font_setFontSize`

调用 2 处：

- `anon_56d7_L34078.js:382`　参数：`[t]`
- `56d7.js:34459`　参数：`[t]`

## `layer_font_setLeading`

调用 4 处：

- `anon_56d7_L34078.js:314`　参数：`[a]`
- `anon_56d7_L34078.js:349`　参数：`[t]`
- `56d7.js:34391`　参数：`[a]`
- `56d7.js:34426`　参数：`[t]`

## `mb_copyTemplatePsd`

调用 2 处：

- `anon_56d7_L19014.js:98`　参数：`[t, this.getFileInfo(`
- `56d7.js:19111`　参数：`[t, this.getFileInfo(`

## `mb_getFolderList`

调用 2 处：

- `anon_56d7_L23411.js:171`　参数：`[n]`
- `56d7.js:23581`　参数：`[n]`

## `mb_openTemplatePsd`

调用 1 处：

- `65bc.js:818`　参数：`[this.getFilePsdPath(this.showList[t].id`

## `overprint_getAllLayers`

调用 2 处：

- `model.js:1074`　无参数
- `56d7.js:52569`　无参数

## `overprint_getSelectedLayerByItemIndex`

调用 2 处：

- `model.js:1183`　无参数
- `56d7.js:52678`　无参数

## `overprint_useOverprint`

调用 2 处：

- `model.js:1630`　参数：`[n]`
- `56d7.js:53125`　参数：`[n]`

## `ps_exportGif`

调用 2 处：

- `CommonUse.js:483`　无参数
- `56d7.js:30080`　无参数

## `ps_mbAddPsd`

调用 1 处：

- `65bc.js:541`　参数：`[this.path.psd]`

## `ps_mbAddPsdSplit`

调用 1 处：

- `65bc.js:578`　参数：`[this.path.psd]`

## `ps_mbImportPsd`

调用 1 处：

- `65bc.js:2041`　参数：`[v, m.path.psd]`

## `tb_getOverprintInfo`

调用 4 处：

- `model.js:1011`　无参数
- `Overprint.js:547`　无参数
- `56d7.js:50572`　无参数
- `56d7.js:52506`　无参数

## `tb_openPsdFolder`

调用 4 处：

- `model.js:1650`　参数：`[n]`
- `Overprint.js:279`　参数：`[n]`
- `56d7.js:50304`　参数：`[n]`
- `56d7.js:53145`　参数：`[n]`

## `tb_setInfoToXmp`

调用 3 处：

- `Overprint.js:529`　参数：`[Object(wt.c`
- `56d7.js:50554`　参数：`[Object(wt.c`
- `56d7.js:53192`　参数：`[Object(wt.c`

## `tb_useOverprint`

调用 2 处：

- `Overprint.js:259`　参数：`[n]`
- `56d7.js:50284`　参数：`[n]`

## `testJsx`

调用 2 处：

- `model.js:1152`　无参数
- `56d7.js:52647`　无参数

## `ys_AddStyle`

调用 2 处：

- `anon_56d7_L43475.js:129`　参数：`[i]`
- `56d7.js:43603`　参数：`[i]`

## `ys_checkUseFont`

调用 4 处：

- `anon_56d7_L34996.js:492`　参数：`[c]`
- `anon_56d7_L43082.js:186`　参数：`[a]`
- `56d7.js:35487`　参数：`[c]`
- `56d7.js:43267`　参数：`[a]`

## `ys_getFontInfo`

调用 4 处：

- `anon_56d7_L34996.js:427`　无参数
- `anon_56d7_L43082.js:227`　无参数
- `56d7.js:35422`　无参数
- `56d7.js:43308`　无参数

## `ys_getForegroundColor`

调用 2 处：

- `anon_56d7_L42077.js:182`　无参数
- `56d7.js:42258`　无参数

## `ys_getGradientInfo`

调用 2 处：

- `anon_56d7_L42669.js:149`　无参数
- `56d7.js:42817`　无参数

## `ys_rgbToMyColor`

调用 1 处：

- `56d7.js:46314`　参数：`[y[20], y[21], y[22]]`

## `ys_setForegroundColor`

调用 1 处：

- `56d7.js:9964`　参数：`[t.data.data]`

## `zdy_checkMergeRectangles`

调用 3 处：

- `Custom.js:78`　无参数
- `56d7.js:9131`　无参数
- `56d7.js:27265`　无参数

## `zdy_checkStatus`

调用 2 处：

- `Custom.js:159`　无参数
- `56d7.js:27346`　无参数

## `zt_changeTextBranchMerge`

调用 2 处：

- `anon_56d7_L30957.js:25`　参数：`[t + 1]`
- `56d7.js:30981`　参数：`[t + 1]`

## `zt_getCurrentFontInfo`

调用 2 处：

- `anon_56d7_L32316.js:56`　无参数
- `56d7.js:32371`　无参数

## `zt_getCurrentText`

调用 2 处：

- `anon_56d7_L34996.js:319`　无参数
- `56d7.js:35314`　无参数

## `zt_getFontSimpleInfo`

调用 2 处：

- `anon_56d7_L34078.js:482`　无参数
- `56d7.js:34559`　无参数

## `zt_setFauxItali`

调用 2 处：

- `anon_56d7_L34078.js:447`　参数：`[t.fontInfo.fauxItalic]`
- `56d7.js:34524`　参数：`[t.fontInfo.fauxItalic]`

## `zt_setFontAddBold`

调用 2 处：

- `anon_56d7_L34078.js:458`　参数：`[this.fontInfo.fauxBold]`
- `56d7.js:34535`　参数：`[this.fontInfo.fauxBold]`

## `zt_setFontAllCaps`

调用 2 处：

- `anon_56d7_L34078.js:429`　参数：`[this.fontInfo.capitalization == "allCaps"]`
- `56d7.js:34506`　参数：`[this.fontInfo.capitalization == "allCaps"]`

## `zt_setFontColor`

调用 2 处：

- `anon_56d7_L34078.js:252`　无参数
- `56d7.js:34329`　无参数

## `zt_setFontName`

调用 4 处：

- `anon_56d7_L32316.js:86`　参数：`[a.hjm[t], a.mz[t], a.zz[t]]`
- `anon_56d7_L34078.js:544`　参数：`[e.hjm[n], e.mz[n], e.zz[n]]`
- `56d7.js:32401`　参数：`[a.hjm[t], a.mz[t], a.zz[t]]`
- `56d7.js:34621`　参数：`[e.hjm[n], e.mz[n], e.zz[n]]`

## `zt_setFontSize`

调用 3 处：

- `anon_56d7_L31794.js:251`　参数：`[t]`
- `anon_56d7_L31869.js:176`　参数：`[t]`
- `56d7.js:32044`　参数：`[t]`

## `zt_setFontVision`

调用 2 处：

- `anon_56d7_L34078.js:437`　参数：`[this.fontInfo.autoKerning]`
- `56d7.js:34514`　参数：`[this.fontInfo.autoKerning]`

## `zt_setFontWordSpacing`

调用 2 处：

- `anon_56d7_L34078.js:285`　参数：`[t]`
- `56d7.js:34362`　参数：`[t]`

## `zt_setHorizontalCenters`

调用 2 处：

- `anon_56d7_L34996.js:204`　参数：`[4], a[t]`
- `56d7.js:35199`　参数：`[4], a[t]`

## `zt_switchFontDirection`

调用 2 处：

- `anon_56d7_L34996.js:449`　无参数
- `56d7.js:35444`　无参数

## `zt_verticalCenter`

调用 2 处：

- `anon_56d7_L34996.js:239`　参数：`[5], a[t]`
- `56d7.js:35234`　参数：`[5], a[t]`

## `ztgl_create_or_replace`

调用 2 处：

- `font-manage_2.js:155`　参数：`[t]`
- `56d7.js:41657`　参数：`[t]`

## `ztgl_initSystemList`

调用 3 处：

- `font-manage_2.js:47`　参数：`[]`
- `56d7.js:2175`　无参数
- `56d7.js:41549`　参数：`[]`

## `ztgl_read_text`

调用 2 处：

- `font-manage_2.js:130`　参数：`[]`
- `56d7.js:41632`　参数：`[]`

## `ztgl_setFont`

调用 4 处：

- `anon_56d7_L33811.js:241`　参数：`[t.hjm[e], t.mz[e], t.zz[e]], "设置字体"`
- `font-manage_2.js:99`　参数：`[a, i, r], "设置字体"`
- `56d7.js:34051`　参数：`[t.hjm[e], t.mz[e], t.zz[e]], "设置字体"`
- `56d7.js:41601`　参数：`[a, i, r], "设置字体"`
