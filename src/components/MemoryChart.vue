<template>
  <div class="memory-chart">
    <div class="chart-container">
      <svg :width="size" :height="size" class="chart-svg">
        <!-- Фоновый круг -->
        <circle
          :cx="center"
          :cy="center"
          :r="radius"
          fill="none"
          stroke="#e0e0e0"
          :stroke-width="strokeWidth"
        />
        <!-- Круг использования памяти -->
        <circle
          :cx="center"
          :cy="center"
          :r="radius"
          fill="none"
          :stroke="color"
          :stroke-width="strokeWidth"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="strokeDashoffset"
          stroke-linecap="round"
          transform="rotate(-90)"
          :transform-origin="`${center}px ${center}px`"
        />
        <!-- Текст в центре -->
        <text :x="center" :y="center - 5" text-anchor="middle" class="percentage-text">
          {{ memoryUsage }}%
        </text>
        <text :x="center" :y="center + 15" text-anchor="middle" class="label-text">Память</text>
      </svg>
    </div>
    <div class="memory-info">
      <div class="memory-details">
        <div class="detail-item">
          <span class="label">Использовано:</span>
          <span class="value">{{ formatBytes(used) }}</span>
        </div>
        <div class="detail-item">
          <span class="label">Свободно:</span>
          <span class="value">{{ formatBytes(free) }}</span>
        </div>
        <div class="detail-item">
          <span class="label">Доступно:</span>
          <span class="value">{{ formatBytes(available) }}</span>
        </div>
        <div class="detail-item">
          <span class="label">Всего:</span>
          <span class="value">{{ formatBytes(total) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: {
    type: Number,
    default: 200,
  },
  memoryUsage: {
    type: Number,
    required: true,
  },
  used: {
    type: Number,
    required: true,
  },
  free: {
    type: Number,
    required: true,
  },
  available: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
})

const center = computed(() => props.size / 2)
const radius = computed(() => (props.size - 20) / 2)
const strokeWidth = computed(() => props.size / 20)
const circumference = computed(() => 2 * Math.PI * radius.value)
const strokeDashoffset = computed(() => {
  const progress = props.memoryUsage / 100
  return circumference.value - progress * circumference.value
})

const color = computed(() => {
  if (props.memoryUsage < 50) return '#4CAF50' // Зеленый
  if (props.memoryUsage < 80) return '#FF9800' // Оранжевый
  return '#F44336' // Красный
})

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
.memory-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-container {
  position: relative;
}

.chart-svg {
  transition: all 0.3s ease;
}

.percentage-text {
  font-size: 24px;
  font-weight: bold;
  fill: #333;
}

.label-text {
  font-size: 12px;
  fill: #666;
}

.memory-info {
  text-align: center;
  width: 100%;
}

.memory-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.detail-item .label {
  color: #666;
}

.detail-item .value {
  font-weight: bold;
  color: #333;
}
</style>
