<script setup lang="ts">
/**
 * 多选 Tab 条（用户批准的「多选 Tab 条」）。
 *
 * 原版 `Style` 页 `.switch`（`app.v4.js:49653-49684`）：
 * - 4 段各占 25%（`.switch-context-wrap{width:25%}`，`data-v-7f4f5fe0`）
 * - 选中色 `.select-switch{color:#006fff!important}`（同上 scoped 段）
 * - 段之间 `1px×20px` 竖线（`.vertical-line{width:1px;height:20px;background-color:#222}`）
 * - 文案 `title="ctrl+点击同时显示"`
 *
 * 语义照 `switchFun`（`app.v4.js:54665` 起）：
 * - 普通点击 = 只留自己（原版 `ysShowTab.map((e, n) => t == n)`；点已选中的那项仍然选中，不会全关）
 * - ctrl+点击 = 只切换自己，其它保持（原版 CAP 环境那条分支）
 *
 * 段数由 `labels.length` 决定，不写死 4；`flex:1` 等价于原版 4×25%。
 */
const props = withDefaults(
  defineProps<{
    /** 每一项是否显示，长度必须与 labels 一致 */
    modelValue: boolean[]
    labels: readonly string[]
    title?: string
  }>(),
  { title: 'ctrl+点击同时显示' },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean[]): void
}>()

function pick(index: number, event: MouseEvent) {
  const next = props.modelValue.slice()
  while (next.length < props.labels.length) next.push(false)

  if (event.ctrlKey) {
    next[index] = !next[index]
  } else {
    for (let i = 0; i < next.length; i++) next[i] = i === index
  }
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="g-tabs">
    <div v-for="(label, index) in labels" :key="label" class="g-tabs__cell">
      <p
        class="g-tabs__label"
        :class="{ 'is-active': modelValue[index] }"
        :title="title"
        @click="pick(index, $event)"
      >
        {{ label }}
      </p>
      <span v-if="index !== labels.length - 1" class="g-tabs__line" />
    </div>
  </div>
</template>

<style scoped>
.g-tabs {
  display: flex;
  width: 100%;
  align-items: center;
}

.g-tabs__cell {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
}

.g-tabs__label {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: var(--text);
  font-size: var(--fs-md);
  text-align: center;
  cursor: pointer;
}

.g-tabs__label:hover {
  color: var(--text-strong);
}

.g-tabs__label.is-active {
  color: var(--c-accent);
}

.g-tabs__line {
  width: 1px;
  height: var(--h-vline);
  background: var(--c-sunken);
}
</style>
