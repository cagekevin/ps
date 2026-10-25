<script setup lang="ts">
import { ref } from 'vue'
import GButton from '@/components/GButton.vue'
import PageShell from '@/components/PageShell.vue'
import { initJsx } from '@/cep/ps'
import { jsx } from '@/cep/jsx'

/**
 * JSX 探针：只用于抓宿主返回的原始结构，不做业务解析。
 * 默认不出现在导航；开发时打开 #/__probe。
 */
const output = ref('')
const running = ref('')

async function probe(label: string, invoke: () => Promise<unknown>) {
  running.value = label
  try {
    await initJsx()
    const raw = await invoke()
    output.value = `${label}\n\n${format(raw)}`
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    output.value = `${label}\n\n[ERROR] ${message}`
  } finally {
    running.value = ''
  }
}

function format(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function probeFontList() {
  return probe('字体列表', () => jsx.font.initSystemList())
}

function probeTextInfo() {
  return probe('当前文字', () => jsx.font.getFontSimpleInfo())
}

function probeFontInfo() {
  return probe('字体属性', () => jsx.font.getFontInfo())
}

function probeActions() {
  return probe('动作列表', () => jsx.action.getActionList())
}

function probeLayer() {
  return probe('图层状态', async () => ({
    selected: await jsx.layer.isSelectLayer(),
    typeNumber: await jsx.layer.getTypeNumber(),
  }))
}
</script>

<template>
  <PageShell title="JSX 探针">
    <div class="probe">
      <div class="probe__actions">
        <GButton size="small" :loading="running === '字体列表'" @click="probeFontList">
          字体列表
        </GButton>
        <GButton size="small" :loading="running === '当前文字'" @click="probeTextInfo">
          当前文字
        </GButton>
        <GButton size="small" :loading="running === '字体属性'" @click="probeFontInfo">
          字体属性
        </GButton>
        <GButton size="small" :loading="running === '动作列表'" @click="probeActions">
          动作列表
        </GButton>
        <GButton size="small" :loading="running === '图层状态'" @click="probeLayer">
          图层状态
        </GButton>
      </div>

      <pre class="probe__output">{{ output || '选择一个探针。' }}</pre>
    </div>
  </PageShell>
</template>

<style scoped>
.probe {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--page-pad-x);
  min-height: 0;
}

.probe__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.probe__output {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: var(--sp-4);
  overflow: auto;
  border-radius: var(--r-md);
  background: var(--c-sunken);
  color: var(--text);
  font-family: monospace;
  font-size: var(--fs-sm);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
