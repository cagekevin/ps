<script setup lang="ts">
import { ref, watch } from 'vue'

/**
 * 星级收藏，对应原版 font-manage-rating。
 * hover 时临时显示到第几星，移开恢复成已选值；点击 emit 具体星数。
 *
 * 原版用 gdaicon 字体图标画星；我们的 sprite 里没有星形，改用文本 ★（不编图标名）。
 */
const props = withDefaults(defineProps<{ selected?: number; nums?: number }>(), {
  selected: 0,
  nums: 3,
})

const emit = defineEmits<{ (e: 'rating', value: number): void }>()

const score = ref(props.selected)

watch(
  () => props.selected,
  (value) => {
    score.value = value
  },
)

function enter(index: number) {
  score.value = index
}

function leave() {
  score.value = props.selected
}
</script>

<template>
  <div class="rating" role="group" aria-label="收藏评分" @mouseleave="leave">
    <button
      v-for="index in nums"
      :key="index"
      class="rating__star"
      :class="{ 'is-on': index <= score }"
      type="button"
      :aria-label="`${index} 星`"
      :aria-pressed="index <= score"
      @mouseenter="enter(index)"
      @click.stop="emit('rating', index)"
    >
      ★
    </button>
  </div>
</template>

<style scoped>
.rating {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
}

/* 原版 .rating>div{padding-left:4px}；.rating .gdaicon{color:#cacaca} */
.rating__star {
  padding: 0 0 0 var(--sp-2);
  border: 0;
  background: transparent;
  color: var(--c-star);
  font-size: var(--fs-md);
  line-height: 1;
}

/* 原版 .rating__icon--active{color:#b3b3b3} */
.rating__star.is-on {
  color: var(--c-star-on);
}

/* 原版星级只有 --active 变色，没有 hover 规则 —— 按规范不加 */
</style>
