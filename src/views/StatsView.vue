<template>
  <div class="stats-view">
    <div class="header">
      <h1>МОНИТОРИНГ СИСТЕМЫ</h1>
      <div class="last-update">
        Последнее обновление: {{ lastUpdate }}
        <button @click="refreshData" class="refresh-btn" :disabled="loading">
          {{ loading ? 'Обновление...' : 'Обновить' }}
        </button>
      </div>
    </div>

    <div v-if="loading && !systemInfo" class="loading">
      <div class="spinner"></div>
      <p>Загрузка системной информации...</p>
    </div>

    <div v-else-if="error" class="error">
      <h3>Ошибка загрузки данных</h3>
      <p>{{ error }}</p>
      <button @click="refreshData" class="retry-btn">Повторить</button>
    </div>

    <div v-else-if="systemInfo" class="monitoring-dashboard">
      <!-- Общая информация о системе -->
      <div class="system-overview">
        <div class="info-card">
          <h3>Время работы системы</h3>
          <div class="uptime">{{ systemInfo.uptime.uptimeFormatted }}</div>
        </div>
        <div class="info-card">
          <h3>Процессор</h3>
          <div class="cpu-info">
            <div>{{ systemInfo.cpu.brand }}</div>
            <div>
              Ядра: {{ systemInfo.cpu.cores }} ({{ systemInfo.cpu.physicalCores }} физических)
            </div>
            <div>Загрузка: {{ systemInfo.cpu.load }}%</div>
          </div>
        </div>
        <div class="info-card">
          <h3>Процессы</h3>
          <div class="process-info">
            <div>Всего: {{ systemInfo.processes.all }}</div>
            <div>Запущено: {{ systemInfo.processes.running }}</div>
            <div>Заблокировано: {{ systemInfo.processes.blocked }}</div>
          </div>
        </div>
      </div>

      <!-- Диаграммы использования ресурсов -->
      <div class="charts-section">
        <div class="chart-row">
          <!-- Диаграмма памяти -->
          <MemoryChart
            :memory-usage="systemInfo.memory.usage"
            :used="systemInfo.memory.used"
            :free="systemInfo.memory.free"
            :available="systemInfo.memory.available"
            :total="systemInfo.memory.total"
          />
        </div>

        <!-- Диаграммы дисков -->
        <div class="disks-section">
          <h3>Использование дисков</h3>
          <div class="disks-grid">
            <DiskUsageChart
              v-for="disk in systemInfo.disks.usage"
              :key="disk.mount"
              :percentage="Math.round((disk.used / disk.size) * 100)"
              :used="disk.used"
              :free="disk.available"
              :total="disk.size"
              :disk-name="disk.mount"
              :label="'Использовано'"
            />
          </div>
        </div>
      </div>

      <!-- Детальная информация о дисках -->
      <div class="disk-details">
        <h3>Детальная информация о дисках</h3>
        <div class="disk-table">
          <table>
            <thead>
              <tr>
                <th>Монтирование</th>
                <th>Тип</th>
                <th>Размер</th>
                <th>Использовано</th>
                <th>Доступно</th>
                <th>Использование</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="disk in systemInfo.disks.usage" :key="disk.mount">
                <td>{{ disk.mount }}</td>
                <td>{{ disk.type }}</td>
                <td>{{ formatBytes(disk.size) }}</td>
                <td>{{ formatBytes(disk.used) }}</td>
                <td>{{ formatBytes(disk.available) }}</td>
                <td>
                  <div class="usage-bar">
                    <div
                      class="usage-fill"
                      :style="{ width: Math.round((disk.used / disk.size) * 100) + '%' }"
                    ></div>
                    <span class="usage-text">{{ Math.round((disk.used / disk.size) * 100) }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import DiskUsageChart from '@/components/DiskUsageChart.vue'
import MemoryChart from '@/components/MemoryChart.vue'

const systemInfo = ref(null)
const loading = ref(false)
const error = ref(null)
const lastUpdate = ref('')
let refreshInterval = null

const fetchSystemInfo = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await fetch('/api/system-info')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    systemInfo.value = data
    lastUpdate.value = new Date().toLocaleString('ru-RU')
    console.log('Системная информация обновлена:', data)
  } catch (err) {
    console.error('Ошибка получения системной информации:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  fetchSystemInfo()
}

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

onMounted(() => {
  fetchSystemInfo()
  // Автоматическое обновление каждые 30 секунд
  refreshInterval = setInterval(fetchSystemInfo, 30000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.stats-view {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.header h1 {
  color: #333;
  margin: 0;
  font-size: 2.5rem;
}

.last-update {
  display: flex;
  align-items: center;
  gap: 15px;
  color: #666;
  font-size: 14px;
}

.refresh-btn,
.retry-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.refresh-btn:hover,
.retry-btn:hover {
  background: #0056b3;
}

.refresh-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 50px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error {
  text-align: center;
  padding: 50px;
  color: #dc3545;
}

.error h3 {
  margin-bottom: 10px;
}

.monitoring-dashboard {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.system-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.info-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.info-card h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 1.2rem;
}

.uptime {
  font-size: 1.5rem;
  font-weight: bold;
  color: #007bff;
}

.cpu-info,
.process-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cpu-info div,
.process-info div {
  font-size: 14px;
  color: #666;
}

.charts-section {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.chart-row {
  display: flex;
  justify-content: center;
}

.disks-section h3 {
  margin-bottom: 20px;
  color: #333;
  font-size: 1.5rem;
}

.disks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.disk-details {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.disk-details h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 1.5rem;
}

.disk-table {
  overflow-x: auto;
}

.disk-table table {
  width: 100%;
  border-collapse: collapse;
}

.disk-table th,
.disk-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.disk-table th {
  background: #f8f9fa;
  font-weight: bold;
  color: #333;
}

.usage-bar {
  position: relative;
  width: 100px;
  height: 20px;
  background: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
}

.usage-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50 0%, #ff9800 50%, #f44336 100%);
  transition: width 0.3s ease;
}

.usage-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .system-overview {
    grid-template-columns: 1fr;
  }

  .disks-grid {
    grid-template-columns: 1fr;
  }
}
</style>
