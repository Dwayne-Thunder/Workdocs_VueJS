<template>
  <div>
    <h1 style="display: flex; align-items: center; justify-content: space-between; gap: 18px">
      ВЫПОЛНЕННЫЕ ЗАЯВКИ
      <div style="display: flex; gap: 10px; align-items: center">
        <button
          class="sync-all-btn beautiful-btn"
          @click="syncAllFiles"
          title="Синхронизировать файлы всех заявок"
        >
          🔄 Синхронизировать все
        </button>
        <button class="health-check-btn" @click="checkServerHealth">Проверить сервер</button>
      </div>
    </h1>

    <!-- Поиск (без тегов) -->
    <div class="search-section">
      <div class="search-inputs">
        <div class="search-field">
          <label>Поиск по номеру договора:</label>
          <input
            v-model="searchDealNumber"
            type="text"
            placeholder="Введите номер договора"
            class="search-input"
          />
        </div>
        <div class="search-field">
          <label>Поиск по адресу:</label>
          <input
            v-model="searchAddress"
            type="text"
            placeholder="Введите адрес"
            class="search-input"
          />
        </div>
        <div class="search-field">
          <label>Поиск по клиенту:</label>
          <input
            v-model="searchClient"
            type="text"
            placeholder="Введите ФИО или телефон клиента"
            class="search-input"
          />
        </div>
      </div>
      <div class="search-actions">
        <button @click="clearSearch" class="clear-search-btn">Очистить поиск</button>
        <div class="search-results-info">
          Найдено: {{ filteredDocs.length }} из {{ completedDocs.length }}
        </div>
      </div>
    </div>

    <div v-if="loading">Загрузка...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <div v-if="successMsg" class="success-msg">{{ successMsg }}</div>
      <div v-if="filteredDocs.length === 0 && (searchDealNumber || searchAddress || searchClient)">
        <div class="no-results">
          По вашему запросу ничего не найдено.
          <button @click="clearSearch" class="clear-search-link">Очистить поиск</button>
        </div>
      </div>
      <div v-else-if="filteredDocs.length === 0">Нет выполненных заявок.</div>
      <div v-for="doc in filteredDocs" :key="doc.OrderNum" class="doc-accordion beautiful-card">
        <div class="doc-header beautiful-header" @click="toggle(doc.OrderNum)">
          <div class="doc-header-main">
            <strong>Заявка №{{ doc.OrderNum || 'Без номера' }}</strong>
            <span v-if="doc.OrderDealNumber && doc.OrderDealDate" class="deal-date">
              от {{ formatDate(doc.OrderDealDate) }}
            </span>
            <span class="doc-header-address"
              >— Адрес объекта: <b>{{ doc.OrderAdress || 'Без адреса' }}</b></span
            >
            <div class="doc-header-tags" v-if="getDocTags(doc.OrderStage).length">
              <span
                class="doc-header-tag doc-header-tag-done"
                v-for="t in getDocTags(doc.OrderStage)"
                :key="doc.OrderNum + '-' + t"
              >
                {{ t }}
              </span>
            </div>
          </div>
          <div class="doc-header-actions">
            <button class="icon-btn beautiful-icon-btn edit-btn" @click.stop="openEditModal(doc)">
              ✎
            </button>
            <button
              class="icon-btn beautiful-icon-btn delete-btn"
              @click.stop="deleteDoc(doc.OrderNum)"
            >
              ✖
            </button>
            <span class="arrow" :class="{ open: opened.includes(doc.OrderNum) }">▲</span>
          </div>
        </div>
        <transition name="fade">
          <div v-if="opened.includes(doc.OrderNum)" class="doc-body beautiful-body">
            <div class="doc-details beautiful-details">
              <div class="details-row">
                <label>
                  <span>Номер договора:</span>
                  <input type="text" :value="doc.OrderDealNumber" readonly />
                </label>
                <label>
                  <span>Дата составления:</span>
                  <input type="text" :value="formatDate(doc.OrderDealDate)" readonly />
                </label>
                <label>
                  <span>Адрес:</span>
                  <input type="text" :value="doc.OrderAdress" readonly />
                </label>
                <label>
                  <span>Дата заявки:</span>
                  <input type="text" :value="formatDate(doc.OrderDate)" readonly />
                </label>
                <label>
                  <span>Клиент:</span>
                  <div class="client-list">
                    <div
                      v-for="(client, idx) in Array.isArray(doc.OrderClient)
                        ? doc.OrderClient
                        : typeof doc.OrderClient === 'string'
                          ? JSON.parse(doc.OrderClient)
                          : []"
                      :key="idx"
                    >
                      <span
                        >{{ client.name }}
                        <span v-if="client.phone">({{ client.phone }})</span></span
                      >
                    </div>
                    <div
                      v-if="
                        !(Array.isArray(doc.OrderClient)
                          ? doc.OrderClient.length
                          : typeof doc.OrderClient === 'string'
                            ? JSON.parse(doc.OrderClient).length
                            : 0)
                      "
                    >
                      Нет клиентов
                    </div>
                  </div>
                </label>
                <label>
                  <span>Дата выезда:</span>
                  <input type="text" :value="formatDate(doc.OrderFieldwork)" readonly />
                </label>
              </div>
              <div class="details-row">
                <label>
                  <span>Статус оплаты:</span>
                  <input
                    type="text"
                    :value="doc.OrderPaymentStatus"
                    readonly
                    class="status-input"
                  />
                </label>
                <label>
                  <span>Заметки:</span>
                  <textarea
                    :value="doc.OrderNotes || ''"
                    readonly
                    style="
                      width: 380px;
                      max-width: 100%;
                      min-width: 220px;
                      min-height: 80px;
                      border: 1.5px solid #d1d5db;
                      border-radius: 7px;
                      background: #f8fafc;
                      color: #232b36;
                      padding: 7px 10px;
                      font-size: 1em;
                      box-sizing: border-box;
                      resize: none;
                    "
                  ></textarea>
                </label>
              </div>
              <div class="details-row">
                <div class="attachments-field" style="flex: 1">
                  <span>Файлы:</span>
                  <div class="files-block beautiful-files-block">
                    <div
                      v-if="
                        attachmentsByOrder[doc.OrderNum] && attachmentsByOrder[doc.OrderNum].length
                      "
                      class="files-list beautiful-files-list"
                    >
                      <div class="files-header">
                        <span class="files-count">
                          Файлов: {{ attachmentsByOrder[doc.OrderNum].length }}
                        </span>
                        <div class="files-actions">
                          <button
                            @click="syncFiles(doc.OrderNum)"
                            class="sync-btn beautiful-btn"
                            title="Синхронизировать файлы с папкой"
                          >
                            🔄 Синхронизировать
                          </button>
                          <button
                            @click="downloadAllFiles(doc.OrderNum)"
                            class="download-all-btn beautiful-btn"
                            title="Скачать все файлы"
                          >
                            📥 Скачать все
                          </button>
                        </div>
                      </div>
                      <div
                        v-for="att in attachmentsByOrder[doc.OrderNum]"
                        :key="att.id"
                        class="file-link beautiful-file-link"
                      >
                        <button
                          @click.prevent="previewFile(att.file_path)"
                          title="Открыть предпросмотр"
                          class="icon-btn beautiful-icon-btn"
                        >
                          <span aria-label="Просмотр">🔍</span>
                        </button>
                        <span
                          :class="['file-tag', getFileTagClass(att.file_name), 'beautiful-tag']"
                          >{{ getFileTagText(att.file_name) }}</span
                        >
                        <a :href="att.file_path" target="_blank" class="file-link-name">{{
                          fixFileNameEncoding(att.file_name)
                        }}</a>
                      </div>
                    </div>
                    <div v-else>
                      <p style="color: #64748b; font-style: italic">Нет файлов</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- Модальное окно для редактирования заявки -->
    <transition name="fade">
      <div v-if="showEditModal" class="modal-overlay">
        <div class="modal-window" :style="{ width: modalWidth + 'px' }">
          <div class="modal-header">
            <h2>Редактировать заявку №{{ editDocData.OrderNum }}</h2>
            <div class="size-controls">
              <button
                type="button"
                class="size-btn"
                @click="modalWidth = 600"
                title="Маленькое окно (600px)"
              >
                S
              </button>
              <button
                type="button"
                class="size-btn"
                @click="modalWidth = 800"
                title="Среднее окно (800px)"
              >
                S
              </button>
              <button
                type="button"
                class="size-btn"
                @click="modalWidth = 1000"
                title="Большое окно (1000px)"
              >
                S
              </button>
            </div>
          </div>
          <form @submit.prevent="saveEditDoc" class="add-form">
            <label>
              <span>Номер договора:</span>
              <input
                v-model="editDocData.OrderDealNumber"
                placeholder="Введите номер договора (необязательно)"
              />
            </label>
            <label>
              <span>Дата составления:</span>
              <input
                :value="toDateInput(editDocData.OrderDealDate)"
                @input="(e) => (editDocData.OrderDealDate = e.target.value)"
                type="date"
                :required="!!editDocData.OrderDealNumber"
              />
            </label>
            <label>
              <span>Адрес:</span>
              <input v-model="editDocData.OrderAdress" required placeholder="Введите адрес" />
            </label>
            <label>
              <span>Дата заявки:</span>
              <input
                :value="toDateInput(editDocData.OrderDate)"
                @input="(e) => (editDocData.OrderDate = e.target.value)"
                type="date"
                required
              />
            </label>
            <label>
              <span>Клиент:</span>
              <div
                v-for="(client, index) in editDocData.OrderClient"
                :key="index"
                class="client-row"
              >
                <input
                  type="text"
                  v-model="editDocData.OrderClient[index].phone"
                  placeholder="Телефон"
                  class="client-input"
                />
                <input
                  type="text"
                  v-model="editDocData.OrderClient[index].name"
                  placeholder="ФИО"
                  class="client-input"
                />
                <button type="button" class="remove-client-btn" @click="removeClient(index)">
                  ✖
                </button>
              </div>
              <button type="button" class="add-client-btn" @click="addClient">
                Добавить клиента
              </button>
            </label>
            <label>
              <span>Дата выезда:</span>
              <input
                :value="toDateInput(editDocData.OrderFieldwork)"
                @input="(e) => (editDocData.OrderFieldwork = e.target.value)"
                type="date"
              />
            </label>
            <label class="full-width">
              <span>Заметки:</span>
              <textarea
                v-model="editDocData.OrderNotes"
                placeholder="Произвольные заметки по заявке"
                style="min-height: 100px"
              ></textarea>
            </label>
            <div class="tags-section">
              <span>Теги:</span>
              <div class="tags-container">
                <span
                  v-for="tag in allowedStages"
                  :key="tag"
                  :class="[
                    'tag',
                    { active: isTagActive(editDocData.OrderStage, tag) },
                    tag === 'Выполнено' ? 'tag-done' : '',
                    tag === 'Выполнено' && isTagActive(editDocData.OrderStage, tag)
                      ? 'tag-done-active'
                      : '',
                  ]"
                  @click="toggleTag(editDocData, tag)"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
            <label>
              <span>Статус оплаты:</span>
              <select v-model="editDocData.OrderPaymentStatus" required class="beautiful-select">
                <option value="Неоплачено">Неоплачено</option>
                <option value="Оплачено">Оплачено</option>
              </select>
            </label>
            <div v-if="editError" class="error" style="margin-top: 8px">{{ editError }}</div>
          </form>
        </div>

        <!-- Кнопки-иконки за пределами модального окна -->
        <div class="floating-action-buttons">
          <button
            class="floating-btn save-btn"
            @click="saveEditDoc"
            :disabled="editLoading"
            title="Сохранить изменения"
          >
            <span v-if="editLoading">⏳</span>
            <span v-else>✓</span>
          </button>
          <button class="floating-btn cancel-btn" @click="closeEditModal" title="Отмена">✖</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const allowedStages = ['Выезд', 'Межевание', 'Вынос', 'Тех.план', 'Выполнено']

const docs = ref([])
const loading = ref(true)
const error = ref('')
const opened = ref([])
const attachmentsByOrder = ref({})
const successMsg = ref('')

// Переменные для поиска
const searchDealNumber = ref('')
const searchAddress = ref('')
const searchClient = ref('')

// Переменные для редактирования
const showEditModal = ref(false)
const editDocData = ref({})
const editError = ref('')
const editLoading = ref(false)
const modalWidth = ref(800)

// Вычисляемое свойство для всех выполненных заявок
const completedDocs = computed(() => {
  return docs.value.filter((doc) => {
    const tags = normalizeOrderStageForServer(doc.OrderStage)
    return Array.isArray(tags) && tags.includes('Выполнено')
  })
})

// Вычисляемое свойство для фильтрации выполненных заявок
const filteredDocs = computed(() => {
  if (!searchDealNumber.value && !searchAddress.value && !searchClient.value) {
    return completedDocs.value
  }

  return completedDocs.value.filter((doc) => {
    // Поиск по номеру договора
    if (searchDealNumber.value && doc.OrderDealNumber) {
      if (!doc.OrderDealNumber.toLowerCase().includes(searchDealNumber.value.toLowerCase())) {
        return false
      }
    }

    // Поиск по адресу
    if (searchAddress.value && doc.OrderAdress) {
      if (!doc.OrderAdress.toLowerCase().includes(searchAddress.value.toLowerCase())) {
        return false
      }
    }

    // Поиск по клиенту
    if (searchClient.value) {
      let clientFound = false
      const clients = Array.isArray(doc.OrderClient)
        ? doc.OrderClient
        : typeof doc.OrderClient === 'string'
          ? JSON.parse(doc.OrderClient)
          : []

      for (const client of clients) {
        if (client.name && client.name.toLowerCase().includes(searchClient.value.toLowerCase())) {
          clientFound = true
          break
        }
        if (client.phone && client.phone.includes(searchClient.value)) {
          clientFound = true
          break
        }
      }

      if (!clientFound) {
        return false
      }
    }

    return true
  })
})

// Функция очистки поиска
function clearSearch() {
  searchDealNumber.value = ''
  searchAddress.value = ''
  searchClient.value = ''
}

function toggle(orderNum) {
  if (opened.value.includes(orderNum)) {
    opened.value = opened.value.filter((x) => x !== orderNum)
  } else {
    opened.value = [orderNum]
    fetchAttachments(orderNum)
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = dateStr.split('T')[0]
  const [year, month, day] = date.split('-')
  return `${day}.${month}.${year}`
}

async function fetchAttachments(orderNum) {
  try {
    const resp = await fetch(`https://workdocs.codequartz.ru/api/attachments/${orderNum}`)
    if (!resp.ok) throw new Error('Ошибка загрузки вложений')
    const data = await resp.json()
    attachmentsByOrder.value[orderNum] = data.attachments || []
  } catch (e) {
    attachmentsByOrder.value[orderNum] = []
  }
}

async function fetchDocs() {
  loading.value = true
  error.value = ''
  try {
    const resp = await fetch('https://workdocs.codequartz.ru/api/docs')

    if (!resp.ok) {
      if (resp.status === 503) {
        const errorData = await resp.json()
        throw new Error(`Сервис временно недоступен: ${errorData.message}`)
      } else {
        throw new Error(`Ошибка сервера: ${resp.status} ${resp.statusText}`)
      }
    }

    const data = await resp.json()
    docs.value = data
    opened.value = []
    attachmentsByOrder.value = {}

    // Загружаем вложения для всех выполненных заявок
    for (const doc of completedDocs.value) {
      fetchAttachments(doc.OrderNum)
    }
  } catch (e) {
    if (e.message.includes('Сервис временно недоступен')) {
      error.value = e.message
    } else if (e.message.includes('Failed to fetch')) {
      error.value = 'Не удается подключиться к серверу. Проверьте, запущен ли сервер.'
    } else {
      error.value = e.message || 'Ошибка загрузки данных'
    }
  } finally {
    loading.value = false
  }
}

// Функции для файлов
function previewFile(link) {
  window.open(link, '_blank')
}

async function syncFiles(orderNum) {
  try {
    console.log('Синхронизация... Проверяем файлы в папке заявки')

    const resp = await fetch(`https://workdocs.codequartz.ru/api/attachments/sync/${orderNum}`, {
      method: 'POST',
    })

    if (!resp.ok) throw new Error('Ошибка синхронизации')

    const result = await resp.json()

    alert(`Синхронизация завершена! ${result.message}`)

    await fetchAttachments(orderNum)
  } catch (e) {
    alert(`Ошибка синхронизации: ${e.message || 'Ошибка синхронизации файлов'}`)
  }
}

async function syncAllFiles() {
  try {
    console.log('Синхронизация всех заявок... Проверяем файлы во всех папках заявок')

    const resp = await fetch('https://workdocs.codequartz.ru/api/attachments/sync-all', {
      method: 'POST',
    })

    if (!resp.ok) throw new Error('Ошибка синхронизации')

    const result = await resp.json()

    alert(`Синхронизация завершена! ${result.message}`)

    for (const doc of completedDocs.value) {
      await fetchAttachments(doc.OrderNum)
    }
  } catch (e) {
    alert(`Ошибка синхронизации: ${e.message || 'Ошибка синхронизации всех файлов'}`)
  }
}

async function downloadAllFiles(orderNum) {
  try {
    const attachments = attachmentsByOrder.value[orderNum] || []

    if (attachments.length === 0) {
      alert('Нет файлов для скачивания')
      return
    }

    const files = attachments.map((att) => att.file_path).filter(Boolean)

    if (files.length === 1) {
      const link = document.createElement('a')
      link.href = `https://workdocs.codequartz.ru${files[0]}`
      link.download = files[0].split('/').pop()
      link.click()
      return
    }

    console.log(`Создание архива... Скачивание ${files.length} файлов`)

    const zipResp = await fetch(
      `https://workdocs.codequartz.ru/api/docs/${orderNum}/download-all`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      },
    )

    if (!zipResp.ok) throw new Error('Ошибка создания архива')

    const blob = await zipResp.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `files_${orderNum}.zip`
    link.click()
    window.URL.revokeObjectURL(url)

    alert(`Архив создан! Скачано ${files.length} файлов`)
  } catch (e) {
    alert(`Ошибка: ${e.message || 'Ошибка скачивания файлов'}`)
  }
}

// Функции для файлов
function isDocument(link) {
  return /\.(pdf|doc|docx)$/i.test(link)
}
function isText(link) {
  return /\.txt$/i.test(link)
}
function isImage(link) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(link)
}
function getFileTagText(link) {
  if (isDocument(link)) return 'ДОКУМЕНТ'
  if (isText(link)) return 'ТЕКСТОВЫЙ ФАЙЛ'
  if (isImage(link)) return 'ИЗОБРАЖЕНИЕ'
  return 'ФАЙЛ'
}
function getFileTagClass(link) {
  if (isDocument(link)) return 'file-tag-doc'
  if (isText(link)) return 'file-tag-txt'
  if (isImage(link)) return 'file-tag-img'
  return 'file-tag-other'
}

function fixFileNameEncoding(fileName) {
  if (!fileName) return ''

  if (fileName.includes('Ð') || fileName.includes('Ñ')) {
    try {
      const bytes = new Uint8Array(fileName.length)
      for (let i = 0; i < fileName.length; i++) {
        bytes[i] = fileName.charCodeAt(i)
      }
      const decoder = new TextDecoder('utf-8')
      return decoder.decode(bytes)
    } catch (e) {
      return fileName
    }
  }

  return fileName
}

function normalizeOrderStageForServer(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : parsed ? [parsed] : []
    } catch {
      return value ? [value] : []
    }
  }
  return []
}

function getDocTags(orderStage) {
  return normalizeOrderStageForServer(orderStage)
}

async function checkServerHealth() {
  try {
    const resp = await fetch('https://workdocs.codequartz.ru/api/health')
    if (!resp.ok) {
      throw new Error(`Сервер недоступен (статус: ${resp.status})`)
    }
    const data = await resp.json()
    const rawDb = data.database || data.databaseStatus || 'нет данных'
    const rawSrv = data.status || data.serverStatus || 'нет данных'

    const dbText =
      rawDb === 'connected' ? 'подключена' : rawDb === 'disconnected' ? 'недоступна' : rawDb
    const srvText =
      rawSrv === 'healthy' ? 'работает' : rawSrv === 'unhealthy' ? 'не работает' : rawSrv

    alert(`Сервер здоров! База данных: ${dbText}, Сервер: ${srvText}`)
  } catch (e) {
    alert(`Ошибка: Сервер недоступен: ${e.message}`)
  }
}

// Функции для редактирования заявок
function openEditModal(doc) {
  editDocData.value = { ...doc }
  if (typeof editDocData.value.OrderClient === 'string') {
    try {
      editDocData.value.OrderClient = JSON.parse(editDocData.value.OrderClient)
    } catch {
      editDocData.value.OrderClient = []
    }
  }
  if (!Array.isArray(editDocData.value.OrderClient) || !editDocData.value.OrderClient.length) {
    editDocData.value.OrderClient = [{ phone: '', name: '' }]
  }
  showEditModal.value = true
  editError.value = ''
  disableBodyScroll()
}

function closeEditModal() {
  showEditModal.value = false
  enableBodyScroll()
}

function disableBodyScroll() {
  document.body.style.overflow = 'hidden'
}

function enableBodyScroll() {
  document.body.style.overflow = ''
}

function toDateInput(val) {
  if (!val) return ''
  if (typeof val === 'string' && val.length === 10) return val
  if (typeof val === 'string' && val.includes('T')) return val.split('T')[0]
  const date = new Date(val)
  const year = date.getUTCFullYear()
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = date.getUTCDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeDocDates(doc) {
  function toDate(val) {
    if (!val) return null
    if (typeof val === 'string' && val.length >= 10) return val.slice(0, 10)
    const date = new Date(val)
    const year = date.getUTCFullYear()
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
    const day = date.getUTCDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return {
    ...doc,
    OrderDealDate: toDate(doc.OrderDealDate),
    OrderDate: toDate(doc.OrderDate),
    OrderFieldwork: toDate(doc.OrderFieldwork),
  }
}

function addClient() {
  if (editDocData.value.OrderClient) {
    editDocData.value.OrderClient.push({ phone: '', name: '' })
  }
}

function removeClient(index) {
  if (editDocData.value.OrderClient && editDocData.value.OrderClient.length > 1) {
    editDocData.value.OrderClient.splice(index, 1)
  }
}

function toggleTag(doc, tag) {
  let currentTags = []
  if (doc.OrderStage) {
    if (typeof doc.OrderStage === 'string') {
      try {
        currentTags = JSON.parse(doc.OrderStage)
      } catch {
        currentTags = [doc.OrderStage]
      }
    } else if (Array.isArray(doc.OrderStage)) {
      currentTags = [...doc.OrderStage]
    } else {
      currentTags = [doc.OrderStage]
    }
  }

  const tagIndex = currentTags.indexOf(tag)
  if (tagIndex > -1) {
    currentTags.splice(tagIndex, 1)
  } else {
    currentTags.push(tag)
  }

  doc.OrderStage = currentTags.length > 0 ? JSON.stringify(currentTags) : ''
}

function isTagActive(orderStage, tag) {
  if (!orderStage) return false

  try {
    if (typeof orderStage === 'string') {
      const tags = JSON.parse(orderStage)
      return Array.isArray(tags) ? tags.includes(tag) : tags === tag
    } else if (Array.isArray(orderStage)) {
      return orderStage.includes(tag)
    } else {
      return orderStage === tag
    }
  } catch {
    return orderStage === tag
  }
}

async function saveEditDoc() {
  editError.value = ''
  if (
    !editDocData.value.OrderAdress ||
    !editDocData.value.OrderDate ||
    !editDocData.value.OrderClient ||
    !editDocData.value.OrderClient.length ||
    !editDocData.value.OrderPaymentStatus ||
    (editDocData.value.OrderDealNumber && !editDocData.value.OrderDealDate)
  ) {
    editError.value = 'Пожалуйста, заполните все обязательные поля.'
    highlightRequiredFieldsEdit()
    return
  }
  try {
    editLoading.value = true
    const payload = { ...normalizeDocDates(editDocData.value) }
    payload.OrderNotes = editDocData.value.OrderNotes || ''
    const resp = await fetch(`https://workdocs.codequartz.ru/api/docs/${payload.OrderNum}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!resp.ok) throw new Error('Ошибка при сохранении изменений')

    showEditModal.value = false
    enableBodyScroll()
    await fetchDocs()
    alert('Заявка обновлена!')
  } catch (e) {
    editError.value = e.message || 'Ошибка при сохранении изменений'
  } finally {
    editLoading.value = false
  }
}

async function deleteDoc(OrderNum) {
  if (!confirm('Удалить эту заявку?')) return
  try {
    const resp = await fetch(`https://workdocs.codequartz.ru/api/docs/${OrderNum}`, {
      method: 'DELETE',
    })
    if (!resp.ok) throw new Error('Ошибка при удалении заявки')
    await fetchDocs()
    alert('Заявка удалена!')
  } catch (e) {
    alert(`Ошибка: ${e.message || 'Ошибка при удалении заявки'}`)
  }
}

// Функция для подсветки обязательных полей
function highlightRequiredFieldsEdit() {
  // Убираем предыдущие подсветки
  document.querySelectorAll('.field-error').forEach((el) => el.classList.remove('field-error'))

  // Подсвечиваем пустые поля
  if (!editDocData.value.OrderAdress) {
    const field = document.querySelector('input[v-model="editDocData.OrderAdress"]')
    if (field) field.classList.add('field-error')
  }
  if (!editDocData.value.OrderDate) {
    const field = document.querySelector('input[v-model="editDocData.OrderDate"]')
    if (field) field.classList.add('field-error')
  }
  if (!editDocData.value.OrderClient || !editDocData.value.OrderClient.length) {
    const fields = document.querySelectorAll('.client-input')
    fields.forEach((field) => field.classList.add('field-error'))
  }
  if (!editDocData.value.OrderPaymentStatus) {
    const field = document.querySelector('select[v-model="editDocData.OrderPaymentStatus"]')
    if (field) field.classList.add('field-error')
  }
  if (editDocData.value.OrderDealNumber && !editDocData.value.OrderDealDate) {
    const field = document.querySelector('input[v-model="editDocData.OrderDealDate"]')
    if (field) field.classList.add('field-error')
  }

  // Убираем подсветку через 3 секунды
  setTimeout(() => {
    document.querySelectorAll('.field-error').forEach((el) => el.classList.remove('field-error'))
  }, 3000)
}

onMounted(() => {
  fetchDocs()
})
</script>

<style scoped>
@import '../assets/base.css';
@import '../assets/main.css';

.beautiful-card {
  border: none;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 4px 24px 0 rgba(59, 130, 246, 0.1);
  margin-bottom: 28px;
  padding: 0;
  overflow: hidden;
  transition: box-shadow 0.2s;
}
.beautiful-card:hover {
  box-shadow: 0 8px 32px 0 rgba(59, 130, 246, 0.16);
}
.beautiful-header {
  background: #f7faff;
  padding: 18px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1.18em;
  cursor: pointer;
}
.doc-header-main {
  display: flex;
  align-items: center;
  gap: 18px;
}
.doc-header-address {
  color: #3b82f6;
  font-weight: 500;
}

.doc-header-tags {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin-left: 6px;
}
.doc-header-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 10px;
  background: #eaf2ff;
  color: #1f3a8a;
  border: 1px solid #bcd2ff;
  border-radius: 9999px;
  font-size: 0.82rem;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(59, 130, 246, 0.14);
}
.doc-header-tag-done {
  background: #e7fff2;
  color: #0f7a49;
  border: 1px solid #a6f0c8;
}

.deal-date {
  color: #64748b;
  font-weight: 600;
  margin-left: 8px;
}

.beautiful-body {
  padding: 24px 28px 18px 28px;
  background: #fafdff;
}
.beautiful-details {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.details-row {
  display: block;
  margin-bottom: 0;
}
.details-row label {
  display: block;
  margin-bottom: 18px;
  margin-top: 18px;
  font-size: 1em;
  width: 100%;
  max-width: 600px;
}
.details-row label:first-child {
  margin-top: 0;
}
.details-row label:last-child {
  margin-bottom: 0;
}
input[readonly],
.status-input {
  border: 1.5px solid #d1d5db;
  border-radius: 7px;
  background: #f8fafc;
  color: #232b36;
  padding: 7px 10px;
  font-size: 1em;
  outline: none;
  box-shadow: none;
  min-width: 120px;
}

.beautiful-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 2px solid #74b9ff;
  background: #fff;
  color: #74b9ff;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(116, 182, 255, 0.1);
}

.beautiful-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f8f9fa;
  color: #adb5bd;
  border-color: #dee2e6;
  box-shadow: none;
}

.beautiful-btn:not(:disabled):hover {
  background: #74b9ff;
  color: #fff;
  border-color: #74b9ff;
  box-shadow: 0 4px 12px rgba(116, 182, 255, 0.2);
  transform: translateY(-1px);
}

.beautiful-files-block {
  margin-top: 6px;
}

.beautiful-files-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.beautiful-file-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  flex-wrap: nowrap;
}

.beautiful-tag {
  font-size: 0.95em;
  font-weight: 600;
  border-radius: 18px;
  padding: 2px 12px;
  margin-right: 4px;
  background: #f8fafc;
  border-width: 2px;
  border-style: solid;
  display: inline-block;
}

.file-tag-doc {
  color: #3b82f6 !important;
  border-color: #3b82f6;
  background: #eaf2ff;
}
.file-tag-txt {
  color: #10b981 !important;
  border-color: #10b981;
  background: #e6fbe6;
}
.file-tag-img {
  color: #f59e42 !important;
  border-color: #f59e42;
  background: #fff5e6;
}
.file-tag-other {
  color: #64748b !important;
  border-color: #64748b;
  background: #f3f6fa;
}

.file-link-name {
  color: #2563eb;
  text-decoration: underline;
  font-size: 0.98em;
  flex: 1;
  min-width: 0;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  padding: 2px 6px;
  border-radius: 6px;
  transition: background 0.15s;
}
.beautiful-icon-btn:hover {
  background: #e9eef5;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.doc-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.client-list {
  width: 380px;
  max-width: 100%;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.98em;
  color: #232b36;
}
.client-list div {
  display: flex;
  align-items: center;
  gap: 8px;
}
.client-list span {
  font-weight: 500;
}
.client-list span:last-child {
  color: #64748b;
}

.details-row label span {
  display: inline-block;
  min-width: 140px;
  margin-right: 18px;
  color: #3b82f6;
  font-weight: 500;
  vertical-align: middle;
}
.details-row label input,
.details-row label select,
.details-row label .client-list {
  vertical-align: middle;
}
.details-row label input[readonly],
.details-row label .status-input {
  width: 380px;
  max-width: 100%;
  min-width: 220px;
  box-sizing: border-box;
}

.attachments-field span {
  display: inline-block;
  min-width: 140px;
  margin-right: 18px;
  color: #3b82f6;
  font-weight: 500;
  vertical-align: middle;
}

/* Стили для поиска */
.search-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
  padding: 20px;
  background: #f7faff;
  border-radius: 18px;
  box-shadow: 0 4px 24px 0 rgba(59, 130, 246, 0.1);
}
.search-inputs {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}
.search-field {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border-radius: 12px;
  padding: 8px 12px;
  border: 1.5px solid #d1d5db;
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.05);
}
.search-field label {
  font-size: 0.9em;
  color: #64748b;
  font-weight: 500;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 1em;
  color: #232b36;
}
.search-input::placeholder {
  color: #94a3b8;
}
.search-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.clear-search-btn {
  background: #f8f9fa;
  color: #6c757d;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-search-btn:hover {
  background: #e9ecef;
  color: #495057;
  border-color: #adb5bd;
  transform: translateY(-1px);
}
.search-results-info {
  font-size: 0.9em;
  color: #64748b;
}
.no-results {
  text-align: center;
  padding: 20px;
  color: #64748b;
  font-size: 1em;
}
.clear-search-link {
  color: #3b82f6;
  text-decoration: underline;
  cursor: pointer;
}
.clear-search-link:hover {
  color: #2563eb;
}

.files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 197, 253, 0.1) 100%);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.files-count {
  font-weight: 600;
  color: #1e40af;
  font-size: 0.9rem;
}

.download-all-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.download-all-btn:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.sync-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sync-btn:hover {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

.sync-all-btn {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sync-all-btn:hover {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.files-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.health-check-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.25);
}

.health-check-btn:hover {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35);
  transform: translateY(-1px);
}

.arrow {
  transition: transform 0.3s ease;
  color: #64748b;
  font-size: 1.2em;
}

.arrow.open {
  transform: rotate(180deg);
}

.edit-btn {
  color: #3b82f6;
}
.edit-btn:hover {
  background: #eaf2ff;
}

.delete-btn {
  color: #e53e3e;
}
.delete-btn:hover {
  background: #ffeaea;
}

/* Стили для модального окна */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(36, 54, 80, 0.18);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 20px;
}

.modal-window {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 100%);
  border-radius: 28px;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  padding: 48px 40px 0 40px;
  min-width: 400px;
  max-width: 98vw;
  width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(20px) saturate(1.8);
  -webkit-backdrop-filter: blur(20px) saturate(1.8);
  border: 1px solid rgba(255, 255, 255, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.modal-window h2 {
  margin: 0;
  color: #1f2937;
  font-size: 1.75rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  flex: 1;
}

.size-controls {
  display: flex;
  gap: 8px;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.modal-header:hover .size-controls {
  opacity: 1;
}

.size-btn {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(209, 213, 219, 0.6);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.size-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}

.add-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 24px;
  margin-top: 18px;
  flex: 1;
  overflow-y: auto;
  padding-bottom: 20px;
  scroll-behavior: smooth;
  align-items: start;
}

.add-form label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 1em;
}

.add-form label span {
  color: #374151;
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: 0.025em;
}

.add-form label.full-width {
  grid-column: 1 / -1;
}

.add-form input,
.add-form select,
.add-form textarea {
  border-radius: 12px;
  border: 2px solid rgba(209, 213, 219, 0.6);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%);
  color: #1f2937;
  font-size: 1em;
  padding: 12px 16px;
  outline: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  font-family: inherit;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.add-form input:focus,
.add-form select:focus,
.add-form textarea:focus {
  border-color: #3b82f6;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%);
  box-shadow:
    0 0 0 4px rgba(59, 130, 246, 0.1),
    0 4px 12px rgba(59, 130, 246, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transform: translateY(-1px);
}

.client-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.client-row .client-input {
  flex: 1;
  min-width: 0;
}

.client-input {
  flex: 1;
  border-radius: 7px;
  border: 1.5px solid #d1d5db;
  background: #f8fafc;
  color: #232b36;
  font-size: 1em;
  padding: 7px 10px;
  outline: none;
  transition: border 0.2s;
}
.client-input:focus {
  border-color: #3b82f6;
}

.remove-client-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  color: #e53e3e;
  padding: 2px 6px;
  border-radius: 6px;
  transition: background 0.15s;
}
.remove-client-btn:hover {
  background: #ffeaea;
}

.add-client-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 10px 20px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: 12px;
  box-shadow:
    0 4px 14px rgba(59, 130, 246, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.add-client-btn:hover {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  box-shadow:
    0 6px 20px rgba(59, 130, 246, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.tags-section {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tags-section span {
  color: #374151;
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: 0.025em;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
  width: 100%;
}

.tag {
  padding: 8px 16px;
  border-radius: 20px;
  background: #f3f4f6;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  font-size: 0.9rem;
  font-weight: 500;
}

.tag:hover {
  background: #e5e7eb;
  transform: translateY(-1px);
}

.tag.active {
  background: #3b82f6;
  color: white;
  border-color: #1d4ed8;
}

.tag-done {
  background: #f0fdf4;
  color: #166534;
  border-color: #22c55e;
}

.tag-done-active {
  background: #22c55e;
  color: white;
  border-color: #16a34a;
}

.beautiful-select {
  border-radius: 7px;
  border: 1.5px solid #d1d5db;
  background: #f8fafc;
  color: #232b36;
  font-size: 1em;
  padding: 7px 10px;
  outline: none;
  transition: border 0.2s;
}
.beautiful-select:focus {
  border-color: #3b82f6;
}

/* Плавающие кнопки */
.floating-action-buttons {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column-reverse;
  gap: 12px;
  z-index: 1001;
  pointer-events: none;
}

.floating-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 8px 25px rgba(0, 0, 0, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.1);
  pointer-events: all;
}

.floating-btn.save-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.floating-btn.save-btn:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow:
    0 12px 35px rgba(0, 0, 0, 0.2),
    0 8px 20px rgba(0, 0, 0, 0.15);
}

.floating-btn.cancel-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.floating-btn.cancel-btn:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow:
    0 12px 35px rgba(0, 0, 0, 0.2),
    0 8px 20px rgba(0, 0, 0, 0.15);
}

/* Белые иконки для плавающих кнопок */
.floating-btn span {
  color: white !important;
  filter: brightness(0) invert(1);
}

.floating-btn:disabled span {
  color: rgba(255, 255, 255, 0.6) !important;
}

.floating-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.error {
  color: #e53e3e;
  font-size: 0.9rem;
  margin-top: 8px;
}

/* Анимация ошибки валидации */
@keyframes errorPulse {
  0% {
    border-color: #ef4444;
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  50% {
    border-color: #dc2626;
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.1);
  }
  100% {
    border-color: #ef4444;
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
}

.field-error {
  animation: errorPulse 0.6s ease-in-out 3;
  border: 2px solid #ef4444 !important;
  background: linear-gradient(
    135deg,
    rgba(254, 226, 226, 0.8) 0%,
    rgba(252, 165, 165, 0.3) 100%
  ) !important;
}
</style>
