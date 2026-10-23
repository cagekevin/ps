<script setup lang="ts">
import CheckBox from '@/components/CheckBox.vue'
import GButton from '@/components/GButton.vue'
import GRadio from '@/components/GRadio.vue'
import SettingsRow from '@/components/SettingsRow.vue'
import { useCommand } from '@/components/command/useCommand'
import { useLoadingStore } from '@/stores/loading'
import { useOptionRef } from '../useCommonUseOptions'

/**
 * ① 嵌入图片（官方 `comembed`，render `up()` `app.v4.js:35732`）。
 * 结构：3 勾选 → hr → 3 单选 + 1 勾选 → hr → 1 勾选 → hr → 2 个 50% 按钮（`:35744-35842`）。
 *
 * TODO(T-88): 参数应落 `sj_set.json` 的 `cyDragInAutoEmbed` / `cyPasetImageAutoEmbed` /
 * `cyClipMaskAutoEmbed` / `cyLinkObject` / `cyDeleteNext` / `cyOpenDranInToLinkObject`
 * （官方 watch 见 `:37602-37616`），本轮只做界面、值先留在组件内（命令尚未提供）。
 */
const dragInAutoEmbed = useOptionRef('cyDragInAutoEmbed', true)
const pasteAutoEmbed = useOptionRef('cyPasetImageAutoEmbed', true)
const clipMaskAutoEmbed = useOptionRef('cyClipMaskAutoEmbed', false)
const linkMode = useOptionRef<string>('cyLinkObject', 'none')
const deleteNextLayer = useOptionRef('cyDeleteNext', false)
const dragInToLink = useOptionRef('cyOpenDranInToLinkObject', false)

/**
 * 两个按钮各一条**无参**命令：官方 `toLinkSmart()` → `cy_smartToLinkSmartObject`（`:35891`）、
 * `linkToSmart()` → `cy_linkSmartObjectToSmartObject`（`:35871`），两者**不是**同一条 jsx。
 */
const toLinkSmartCmd = useCommand('commonUse.smartToLinkSmartObject')
const linkToSmartCmd = useCommand('commonUse.linkSmartObjectToSmartObject')

/**
 * 执行中全屏遮罩 + 官方文案（官方 `toLinkSmart` `:35889` / `linkToSmart` `:35869` 各自
 * `$load.show(...)` … `$load.hide()`）。`loading.run` 内部是 try/finally，失败也一定撤遮罩。
 */
const loading = useLoadingStore()

function toLinkSmart() {
  void loading.run('正在转链接智能对象...', () => toLinkSmartCmd.run())
}

function linkToSmart() {
  void loading.run('正在转回普通智能对象...', () => linkToSmartCmd.run())
}
</script>

<template>
  <div class="panel-embed">
    <SettingsRow><CheckBox v-model="dragInAutoEmbed">拖入图片自动嵌入图片</CheckBox></SettingsRow>
    <SettingsRow><CheckBox v-model="pasteAutoEmbed">粘贴图片自动嵌入图片</CheckBox></SettingsRow>
    <SettingsRow
      ><CheckBox v-model="clipMaskAutoEmbed">使用剪贴蒙版时自动嵌入图片</CheckBox></SettingsRow
    >

    <hr class="panel-embed__rule" />

    <SettingsRow>
      <GRadio v-model="linkMode" value="none">嵌入时不存链接对象</GRadio>
    </SettingsRow>
    <SettingsRow>
      <GRadio v-model="linkMode" value="original">嵌入时存链接对象(图片原始路径)</GRadio>
    </SettingsRow>
    <SettingsRow>
      <GRadio v-model="linkMode" value="sameFolder">嵌入时存链接对象(与PSD同一目录)</GRadio>
    </SettingsRow>
    <SettingsRow><CheckBox v-model="deleteNextLayer">删除下一图层</CheckBox></SettingsRow>

    <hr class="panel-embed__rule" />

    <SettingsRow><CheckBox v-model="dragInToLink">拖入图片转成链接智能对象</CheckBox></SettingsRow>

    <hr class="panel-embed__rule" />

    <SettingsRow>
      <GButton width="half" @click="toLinkSmart()">转链接智能对象</GButton>
      <GButton width="half" @click="linkToSmart()">转智能对象</GButton>
    </SettingsRow>
  </div>
</template>

<style scoped>
.panel-embed {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  padding: var(--sp-5) 0;
}

.panel-embed__rule {
  height: 1px;
  margin: var(--sp-2) 0;
  border: none;
  background: var(--c-divider);
}
</style>
