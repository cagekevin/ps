<script setup lang="ts">
import { ref, watch } from 'vue'
import CepModal from '@/components/CepModal.vue'
import GButton from '@/components/GButton.vue'
import SelectBox from '@/components/SelectBox.vue'
import { dirUsage, userDir } from '@/cep/fs'
import { formatBytes } from '../cache-format'

/**
 * 原版 `ClearCacheDialog`（`docs/生成/页面规格/08-设置.md:416-459`，render `IT()` 62668）。
 *
 * **只读版（T-68）**：原版 `clearCache()` 删哪些文件没有任何一手证据，
 * 按 `userDir()` 删会把用户的样式库 / 动作仓库 / 重命名预设一起删掉（P0 丢数据），
 * 所以「清理缓存」置灰；上限档位同样未提取（只知道 `currentSelectIndex:1`，至少 2 档），
 * 下拉置灰且不给自拟档位。
 */
const props = defineProps<{ visible: boolean }>()

const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>()

const usageText = ref('—')
/**
 * 原版 `currentSelectIndex:1`（`docs/页面/08-设置.md:61`）指向**原版档位列表**；
 * 那个列表的档位值未提取，所以这里只有一条占位项，索引跟着占位项走（0）。
 */
const limitIndex = ref(0)
const limitOptions = [{ label: '未设置' }]

// UNVERIFIED: 「缓存」是哪个目录未提取（原版只有 `Ca.diskUsage()` 这个调用名，
// `docs/页面/08-设置.md:86`）。这里按用户数据目录 `userDir()` 统计，只读不删。
function refresh() {
  try {
    const usage = dirUsage(userDir())
    // 有文件读不到时 bytes 只是下限：必须让"这个数字不准"看得见（TD-06-5 之前少算了多少没人知道）
    usageText.value = !usage
      ? '无法读取'
      : usage.skipped > 0
        ? `${formatBytes(usage.bytes)}（${usage.skipped} 个文件读不到，可能更大）`
        : formatBytes(usage.bytes)
  } catch {
    // Node 不可用（jsdom / 未开 --enable-nodejs）：显示「无法读取」，不显示 0
    usageText.value = '无法读取'
  }
}

watch(
  () => props.visible,
  (open) => {
    if (open) refresh()
  },
  { immediate: true },
)
</script>

<template>
  <CepModal
    :visible="visible"
    title="清理缓存"
    ok-text="关闭"
    hide-cancel
    @update:visible="emit('update:visible', $event)"
  >
    <div class="cache">
      <div class="cache__row">
        <span>缓存大小</span>
        <span class="cache__value">{{ usageText }}</span>
      </div>

      <GButton class="cache__clear" block disabled>清理缓存</GButton>

      <p class="cache__title">缓存设置</p>

      <div class="cache__row">
        <span>设置缓存上限</span>
        <SelectBox
          class="cache__limit"
          :options="limitOptions"
          :model-value="limitIndex"
          disabled
        />
      </div>

      <p class="cache__hint">缓存上限档位与清理范围尚未取得原版依据，本版只读。</p>
    </div>
  </CepModal>
</template>

<style scoped>
.cache {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  color: var(--c-text-strong);
  font-size: var(--fs-md);
}

/* 原版 `.f-alignNone mt5`：两端对齐的一行（`生成/页面规格/08-设置.md:429`） */
.cache__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
}

.cache__value {
  color: var(--c-text-inverse);
}

/* 原版 `.clear_btn` 高 34px、圆角 4、文字居中（同上 :431）；GButton 已给尺寸，只补间距 */
.cache__clear {
  height: var(--h-control);
}

.cache__title {
  margin: 0;
  color: var(--c-text-inverse);
}

.cache__limit {
  width: 96px;
}

.cache__hint {
  margin: 0;
  color: var(--c-text-faint);
}
</style>
