<template>
  <div>
    <h1 style="display: flex; align-items: center; justify-content: space-between; gap: 18px">
      ВСЕ ЗАЯВКИ
      <div style="display: flex; gap: 10px; align-items: center">
        <button
          class="sync-all-btn beautiful-btn"
          @click="syncAllFiles"
          title="Синхронизировать файлы всех заявок"
        >
          🔄 Синхронизировать все
        </button>
        <button class="health-check-btn" @click="checkServerHealth">Проверить сервер</button>
        <button class="add-btn compact" @click="openAddModal">
          <span class="add-icon">＋</span> <span class="add-text">Добавить</span>
        </button>
      </div>
    </h1>

    <!-- Поиск -->
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
        <div class="search-field search-tags-field">
          <div class="tags-label-row">
            <label>Теги:</label>
            <button
              type="button"
              class="clear-tags-btn"
              v-if="searchTags.length"
              @click="clearTags"
            >
              Сбросить теги
            </button>
          </div>
          <div class="tags-container">
            <span
              v-for="tag in allowedStages"
              :key="tag"
              :class="[
                'tag',
                { active: searchTags.includes(tag) },
                tag === 'Выполнено' ? 'tag-done' : '',
                tag === 'Выполнено' && searchTags.includes(tag) ? 'tag-done-active' : '',
              ]"
              @click="toggleSearchTag(tag)"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </div>
      <div class="search-actions">
        <button @click="clearSearch" class="clear-search-btn">Очистить поиск</button>
        <div class="search-results-info">
          Найдено: {{ filteredDocs.length }} из {{ docs.length }}
        </div>
        <div class="selected-tags" v-if="searchTags.length">
          <span class="selected-tags-label">Применены:</span>
          <span class="selected-tag" v-for="tag in searchTags" :key="'sel-' + tag">{{ tag }}</span>
        </div>
      </div>
    </div>

    <!-- Баннер для просроченных заявок -->
    <div v-if="!loading && !error && (overdueCount > 0 || urgentCount > 0)" class="alert-banner">
      <div v-if="overdueCount > 0" class="alert-banner-overdue">
        <span class="alert-icon">⚠️</span>
        <span class="alert-text">
          <strong>{{ overdueCount }}</strong> {{ getOverdueText(overdueCount) }}!
        </span>
        <button class="alert-btn" @click="showOverdueOnly" title="Показать только просроченные">
          👁️
        </button>
      </div>
      <div v-if="urgentCount > 0" class="alert-banner-urgent">
        <span class="alert-icon">⏰</span>
        <span class="alert-text">
          <strong>{{ urgentCount }}</strong> {{ getUrgentText(urgentCount) }} до дедлайна менее 4
          дней!
        </span>
        <button class="alert-btn" @click="showUrgentOnly" title="Показать только срочные">
          👁️
        </button>
      </div>
    </div>

    <!-- Индикатор активного фильтра -->
    <div v-if="showOverdueFilter || showUrgentFilter" class="active-filter-indicator">
      <div class="filter-info">
        <span v-if="showOverdueFilter" class="filter-badge overdue">
          ⚠️ Показаны только просроченные заявки
        </span>
        <span v-if="showUrgentFilter" class="filter-badge urgent">
          ⏰ Показаны только срочные заявки
        </span>
        <button class="clear-filter-btn" @click="clearAlertFilters" title="Показать все заявки">
          ✖️ Сбросить фильтр
        </button>
      </div>
    </div>

    <div v-if="loading">Загрузка...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <div v-if="successMsg" class="success-msg">{{ successMsg }}</div>
      <div
        v-if="
          filteredDocs.length === 0 &&
          (searchDealNumber || searchAddress || searchClient || searchTags.length)
        "
      >
        <div class="no-results">
          По вашему запросу ничего не найдено.
          <button @click="clearSearch" class="clear-search-link">Очистить поиск</button>
        </div>
      </div>
      <div v-else-if="filteredDocs.length === 0">Нет заявок.</div>
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
                class="doc-header-tag"
                :class="{ 'doc-header-tag-done': t === 'Выполнено' }"
                v-for="t in getDocTags(doc.OrderStage)"
                :key="doc.OrderNum + '-' + t"
              >
                {{ t }}
              </span>
            </div>
            <span
              v-if="doc.OrderDealNumber && doc.OrderDealDate && !isDocDone(doc)"
              class="deal-deadline"
              :class="getDealDeadlineClass(doc)"
              :style="getDealDeadlineStyle(doc)"
            >
              ⏳ {{ getDealDaysLeftText(doc) }}
            </span>
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
                <label class="stage-row">
                  <span>Теги:</span>
                  <div class="tags-container">
                    <span
                      v-for="tag in allowedStages"
                      :key="tag"
                      :class="[
                        'tag',
                        { active: isTagActive(doc.OrderStage, tag) },
                        tag === 'Выполнено' ? 'tag-done' : '',
                        tag === 'Выполнено' && isTagActive(doc.OrderStage, tag)
                          ? 'tag-done-active'
                          : '',
                      ]"
                      @click="toggleTag(doc, tag)"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </label>
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
                  <div style="position: relative; width: 380px; max-width: 100%; min-width: 220px">
                    <textarea
                      v-if="!notesEditMode[doc.OrderNum]"
                      :value="doc.OrderNotes || ''"
                      readonly
                      @click="startNotesEdit(doc.OrderNum, doc.OrderNotes)"
                      style="
                        width: 100%;
                        min-height: 80px;
                        border: 1.5px solid #d1d5db;
                        border-radius: 7px;
                        background: #f8fafc;
                        color: #232b36;
                        padding: 7px 10px;
                        font-size: 1em;
                        box-sizing: border-box;
                        cursor: pointer;
                        resize: none;
                      "
                      title="Нажмите для редактирования"
                    ></textarea>
                    <div v-else style="display: flex; flex-direction: column; gap: 8px">
                      <textarea
                        v-model="editingNotes[doc.OrderNum]"
                        style="
                          width: 100%;
                          min-height: 80px;
                          border: 1.5px solid #3b82f6;
                          border-radius: 7px;
                          background: #fff;
                          color: #232b36;
                          padding: 7px 10px;
                          font-size: 1em;
                          box-sizing: border-box;
                          resize: none;
                        "
                        placeholder="Введите заметки..."
                      ></textarea>
                      <div style="display: flex; gap: 8px">
                        <button
                          @click="saveNotes(doc.OrderNum)"
                          class="beautiful-btn"
                          style="padding: 4px 12px; font-size: 0.9em"
                        >
                          Сохранить
                        </button>
                        <button
                          @click="cancelNotesEdit(doc.OrderNum)"
                          class="beautiful-btn cancel-btn"
                          style="padding: 4px 12px; font-size: 0.9em"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
              <div class="details-row">
                <div class="attachments-field" style="flex: 1">
                  <span>Файлы:</span>
                  <div class="files-block beautiful-files-block">
                    <form
                      @submit.prevent="uploadAttachment(doc, $event)"
                      class="upload-form beautiful-upload-form"
                    >
                      <input
                        type="file"
                        name="files"
                        :id="'file-input-' + doc.OrderNum"
                        multiple
                        @change="handleFileSelection(doc.OrderNum, $event)"
                      />
                      <button type="submit" class="upload-btn beautiful-btn">
                        <span v-if="selectedFilesCount[doc.OrderNum] > 1">
                          Загрузить {{ selectedFilesCount[doc.OrderNum] }} файлов
                        </span>
                        <span v-else>Загрузить</span>
                      </button>
                    </form>
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
                        <button
                          @click.prevent="deleteAttachment(doc.OrderNum, att.id)"
                          title="Удалить файл"
                          class="icon-btn beautiful-icon-btn delete-btn"
                        >
                          <span aria-label="Удалить">✖</span>
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- Модальное окно для добавления заявки -->
    <transition name="fade">
      <div v-if="showAddModal" class="modal-overlay">
        <div class="modal-window" :style="{ width: modalWidth + 'px' }" @resize="handleModalResize">
          <div class="modal-header">
            <h2>Добавить новую заявку</h2>
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
                M
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
          <form @submit.prevent="addNewDoc" class="add-form">
            <label>
              <span>Номер договора:</span>
              <input
                v-model="newDoc.OrderDealNumber"
                placeholder="Введите номер договора (необязательно)"
              />
            </label>
            <label>
              <span>Дата составления:</span>
              <input
                :value="toDateInput(newDoc.OrderDealDate)"
                @input="(e) => (newDoc.OrderDealDate = e.target.value)"
                type="date"
                :required="!!newDoc.OrderDealNumber"
              />
            </label>
            <label>
              <span>Адрес:</span>
              <input v-model="newDoc.OrderAdress" required placeholder="Введите адрес" />
            </label>
            <label>
              <span>Дата заявки:</span>
              <input
                :value="toDateInput(newDoc.OrderDate)"
                @input="(e) => (newDoc.OrderDate = e.target.value)"
                type="date"
                required
              />
            </label>
            <div class="client-section">
              <span>Клиент:</span>
              <div v-for="(client, index) in newDoc.OrderClient" :key="index" class="client-row">
                <input
                  type="text"
                  v-model="newDoc.OrderClient[index].phone"
                  placeholder="Телефон"
                  class="client-input"
                />
                <input
                  type="text"
                  v-model="newDoc.OrderClient[index].name"
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
            </div>
            <label>
              <span>Дата выезда:</span>
              <input
                :value="toDateInput(newDoc.OrderFieldwork)"
                @input="(e) => (newDoc.OrderFieldwork = e.target.value)"
                type="date"
              />
            </label>
            <label class="full-width">
              <span>Заметки:</span>
              <textarea
                v-model="newDoc.OrderNotes"
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
                    { active: isTagActive(newDoc.OrderStage, tag) },
                    tag === 'Выполнено' ? 'tag-done' : '',
                    tag === 'Выполнено' && isTagActive(newDoc.OrderStage, tag)
                      ? 'tag-done-active'
                      : '',
                  ]"
                  @click="toggleTag(newDoc, tag)"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
            <label>
              <span>Статус оплаты:</span>
              <select v-model="newDoc.OrderPaymentStatus" required class="beautiful-select">
                <option value="Неоплачено">Неоплачено</option>
                <option value="Оплачено">Оплачено</option>
              </select>
            </label>
            <!-- Кнопки вынесены за пределы модального окна -->
            <div v-if="addError" class="error" style="margin-top: 8px">{{ addError }}</div>
          </form>
        </div>

        <!-- Кнопки-иконки за пределами модального окна -->
        <div class="floating-action-buttons">
          <button
            class="floating-btn add-btn"
            @click="addNewDoc"
            :disabled="loading"
            title="Добавить заявку"
          >
            <span v-if="loading">⏳</span>
            <span v-else>➕</span>
          </button>
          <button class="floating-btn cancel-btn" @click="closeAddModal" title="Отмена">✖</button>
        </div>
      </div>
    </transition>

    <!-- Модальное окно для редактирования заявки -->
    <transition name="fade">
      <div v-if="showEditModal" class="modal-overlay">
        <div class="modal-window" :style="{ width: modalWidth + 'px' }" @resize="handleModalResize">
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
                M
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
            <!-- Кнопки вынесены за пределы модального окна -->
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
import { ref, onMounted, watch, computed } from 'vue'

const allowedStages = ['Выезд', 'Межевание', 'Вынос', 'Тех.план', 'Выполнено']

const docs = ref([])
const loading = ref(true)
const error = ref('')
const opened = ref([])
const attachmentsByOrder = ref({})
const successMsg = ref('')
const showAddModal = ref(false)
const addError = ref('')
const newDoc = ref({
  OrderDealNumber: '',
  OrderDealDate: '',
  OrderAdress: '',
  OrderDate: '',
  OrderClient: [{ phone: '', name: '' }],
  OrderFieldwork: '',
  OrderStage: '',
  OrderPaymentStatus: 'Неоплачено',
  OrderNotes: '',
})
const showEditModal = ref(false)
const editDocData = ref({})
const editError = ref('')
const originalDealNumber = ref('')

// Состояние для редактирования заметок
const editingNotes = ref({})
const notesEditMode = ref({})

// Состояние для размера модального окна
const modalWidth = ref(800)

// Состояние для множественных файлов
const selectedFilesCount = ref({})

// Переменные для поиска
const searchDealNumber = ref('')
const searchAddress = ref('')
const searchClient = ref('')
const searchTags = ref([])
const showOverdueFilter = ref(false)
const showUrgentFilter = ref(false)

// Вычисляемые свойства для баннера
const overdueCount = computed(() => {
  return docs.value.filter((doc) => {
    // Исключаем выполненные заявки
    const tags = normalizeOrderStageForServer(doc.OrderStage)
    const isCompleted = Array.isArray(tags) && tags.includes('Выполнено')
    if (isCompleted) return false

    const daysLeft = getDealDaysLeft(doc)
    return daysLeft !== null && daysLeft <= 0
  }).length
})

const urgentCount = computed(() => {
  return docs.value.filter((doc) => {
    // Исключаем выполненные заявки
    const tags = normalizeOrderStageForServer(doc.OrderStage)
    const isCompleted = Array.isArray(tags) && tags.includes('Выполнено')
    if (isCompleted) return false

    const daysLeft = getDealDaysLeft(doc)
    return daysLeft !== null && daysLeft > 0 && daysLeft <= 4
  }).length
})

// Функции для правильного склонения
function getOverdueText(count) {
  if (count === 1) return 'заявка просрочена'
  if (count >= 2 && count <= 4) return 'заявки просрочены'
  return 'заявок просрочено'
}

function getUrgentText(count) {
  if (count === 1) return 'заявка'
  if (count >= 2 && count <= 4) return 'заявки'
  return 'заявок'
}

// Функции для фильтрации заявок
function showOverdueOnly() {
  // Очищаем текущие фильтры
  searchDealNumber.value = ''
  searchAddress.value = ''
  searchClient.value = ''
  searchTags.value = []

  // Устанавливаем фильтр по просроченным
  showOverdueFilter.value = true
  showUrgentFilter.value = false
}

function showUrgentOnly() {
  // Очищаем текущие фильтры
  searchDealNumber.value = ''
  searchAddress.value = ''
  searchClient.value = ''
  searchTags.value = []

  // Устанавливаем фильтр по срочным
  showOverdueFilter.value = false
  showUrgentFilter.value = true
}

function clearAlertFilters() {
  showOverdueFilter.value = false
  showUrgentFilter.value = false
}

// Вычисляемое свойство для фильтрации заявок (исключая выполненные)
const filteredDocs = computed(() => {
  console.log('filteredDocs computed - docs.value:', docs.value)
  console.log('Поиск по договору:', searchDealNumber.value)
  console.log('Поиск по адресу:', searchAddress.value)
  console.log('Поиск по клиенту:', searchClient.value)
  console.log('Поиск по тегам:', searchTags.value)

  // Сначала исключаем выполненные заявки
  const nonCompletedDocs = docs.value.filter((doc) => {
    const tags = normalizeOrderStageForServer(doc.OrderStage)
    return !(Array.isArray(tags) && tags.includes('Выполнено'))
  })

  // Применяем фильтры по дедлайну
  let filtered = nonCompletedDocs
  if (showOverdueFilter.value) {
    filtered = filtered.filter((doc) => {
      const daysLeft = getDealDaysLeft(doc)
      return daysLeft !== null && daysLeft <= 0
    })
    console.log('После фильтра просроченных:', filtered.length)
  } else if (showUrgentFilter.value) {
    filtered = filtered.filter((doc) => {
      const daysLeft = getDealDaysLeft(doc)
      return daysLeft !== null && daysLeft > 0 && daysLeft <= 4
    })
    console.log('После фильтра срочных:', filtered.length)
  }

  if (
    !searchDealNumber.value &&
    !searchAddress.value &&
    !searchClient.value &&
    !searchTags.value.length
  ) {
    console.log('Нет поиска, возвращаем отфильтрованные заявки:', filtered)
    return filtered
  }

  return filtered.filter((doc) => {
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

    // Фильтрация по тегам (логика OR: хотя бы один выбранный тег присутствует в заявке)
    if (searchTags.value.length) {
      const docTags = normalizeOrderStageForServer(doc.OrderStage)
      const hasAny = searchTags.value.some((t) => docTags.includes(t))
      if (!hasAny) return false
    }

    return true
  })
})

// Функция очистки поиска
function clearSearch() {
  searchDealNumber.value = ''
  searchAddress.value = ''
  searchClient.value = ''
  searchTags.value = []
}

function clearTags() {
  searchTags.value = []
}

function toggleSearchTag(tag) {
  const idx = searchTags.value.indexOf(tag)
  if (idx > -1) {
    searchTags.value.splice(idx, 1)
  } else {
    searchTags.value.push(tag)
  }
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

function toMoscowDateInput(val) {
  if (!val) return ''
  // Если строка формата YYYY-MM-DD, возвращаем как есть
  if (typeof val === 'string' && val.length === 10) return val
  // Если строка формата с T (например, 2024-06-10T00:00:00.000Z), берём только дату
  if (typeof val === 'string' && val.includes('T')) return val.split('T')[0]
  // Если это объект Date или timestamp
  const date = new Date(val)
  // Преобразуем к МСК (UTC+3)
  const year = date.getUTCFullYear()
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = date.getUTCDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeDocDates(doc) {
  function toDate(val) {
    if (!val) return null
    // Если строка формата YYYY-MM-DD, возвращаем как есть
    if (typeof val === 'string' && val.length >= 10) return val.slice(0, 10)
    // Если это объект Date или timestamp, преобразуем к МСК
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

// Заменяю старую функцию toDateInput на новую
function toDateInput(val) {
  return toMoscowDateInput(val)
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
    console.log('Загружаем заявки...')
    const resp = await fetch('https://workdocs.codequartz.ru/api/docs')
    console.log('Ответ сервера:', resp.status, resp.statusText)

    if (!resp.ok) {
      if (resp.status === 503) {
        const errorData = await resp.json()
        throw new Error(`Сервис временно недоступен: ${errorData.message}`)
      } else {
        throw new Error(`Ошибка сервера: ${resp.status} ${resp.statusText}`)
      }
    }

    const data = await resp.json()
    console.log('Полученные данные:', data)
    console.log('Количество заявок:', data.length)

    docs.value = data
    opened.value = []
    attachmentsByOrder.value = {}
    // Загружаем вложения для всех заявок
    for (const doc of docs.value) {
      fetchAttachments(doc.OrderNum)
    }

    console.log('Заявки загружены успешно, docs.value:', docs.value)
  } catch (e) {
    console.error('Ошибка загрузки заявок:', e)

    // Показываем понятное сообщение об ошибке
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

// Обработка выбора множественных файлов
function handleFileSelection(orderNum, event) {
  const files = event.target.files
  selectedFilesCount.value[orderNum] = files.length
}

async function uploadAttachment(doc, event) {
  const input = event.target.querySelector('input[type=file]')

  if (!input.files.length) return

  const files = Array.from(input.files)

  try {
    // Загружаем каждый файл отдельно через новый API
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)

      const resp = await fetch(
        `https://workdocs.codequartz.ru/api/attachments/upload/${doc.OrderNum}`,
        {
          method: 'POST',
          body: formData,
        },
      )

      if (!resp.ok) throw new Error('Ошибка загрузки файлов')
    }

    alert(files.length > 1 ? `Загружено ${files.length} файлов!` : 'Файл загружен!')

    input.value = ''
    selectedFilesCount.value[doc.OrderNum] = 0
    await fetchAttachments(doc.OrderNum)
  } catch (e) {
    alert(`Ошибка: ${e.message || 'Ошибка загрузки файлов'}`)
  }
}

async function deleteAttachment(orderNum, id) {
  if (!confirm('Удалить это вложение?')) return
  try {
    const resp = await fetch(`https://workdocs.codequartz.ru/api/attachments/${id}`, {
      method: 'DELETE',
    })
    if (!resp.ok) throw new Error('Ошибка удаления вложения')
    await fetchAttachments(orderNum)
  } catch (e) {
    alert(e.message || 'Ошибка удаления вложения')
  }
}

function previewFile(link) {
  window.open(link, '_blank')
}

// Синхронизация файлов конкретной заявки
async function syncFiles(orderNum) {
  try {
    console.log('Синхронизация... Проверяем файлы в папке заявки')

    const resp = await fetch(`https://workdocs.codequartz.ru/api/attachments/sync/${orderNum}`, {
      method: 'POST',
    })

    if (!resp.ok) throw new Error('Ошибка синхронизации')

    const result = await resp.json()

    alert(`Синхронизация завершена! ${result.message}`)

    // Обновляем список файлов
    await fetchAttachments(orderNum)
  } catch (e) {
    alert(`Ошибка синхронизации: ${e.message || 'Ошибка синхронизации файлов'}`)
  }
}

// Синхронизация файлов всех заявок
async function syncAllFiles() {
  try {
    console.log('Синхронизация всех заявок... Проверяем файлы во всех папках заявок')

    const resp = await fetch('https://workdocs.codequartz.ru/api/attachments/sync-all', {
      method: 'POST',
    })

    if (!resp.ok) throw new Error('Ошибка синхронизации')

    const result = await resp.json()

    alert(`Синхронизация завершена! ${result.message}`)

    // Обновляем список файлов для всех заявок
    for (const doc of docs.value) {
      await fetchAttachments(doc.OrderNum)
    }
  } catch (e) {
    alert(`Ошибка синхронизации: ${e.message || 'Ошибка синхронизации всех файлов'}`)
  }
}

// Функция для массового скачивания всех файлов
async function downloadAllFiles(orderNum) {
  try {
    // Получаем список файлов из attachments
    const attachments = attachmentsByOrder.value[orderNum] || []

    if (attachments.length === 0) {
      alert('Нет файлов для скачивания')
      return
    }

    // Формируем список путей к файлам
    const files = attachments.map((att) => att.file_path).filter(Boolean)

    if (files.length === 1) {
      // Если файл один, скачиваем напрямую
      const link = document.createElement('a')
      link.href = `https://workdocs.codequartz.ru${files[0]}`
      link.download = files[0].split('/').pop()
      link.click()
      return
    }

    // Для множественных файлов создаем ZIP архив
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
function getFileName(link) {
  if (typeof link !== 'string') return ''
  return link.split('/').pop()
}

// Функция для исправления кодировки имени файла
function fixFileNameEncoding(fileName) {
  if (!fileName) return ''

  // Если имя файла содержит некорректные символы кодировки
  if (fileName.includes('Ð') || fileName.includes('Ñ')) {
    try {
      // Пытаемся исправить кодировку
      const bytes = new Uint8Array(fileName.length)
      for (let i = 0; i < fileName.length; i++) {
        bytes[i] = fileName.charCodeAt(i)
      }
      const decoder = new TextDecoder('utf-8')
      return decoder.decode(bytes)
    } catch (e) {
      console.log('Не удалось исправить кодировку:', fileName)
      return fileName
    }
  }

  return fileName
}

async function addNewDoc() {
  addError.value = ''
  // Простая валидация
  if (
    !newDoc.value.OrderAdress ||
    !newDoc.value.OrderDate ||
    !newDoc.value.OrderClient ||
    !newDoc.value.OrderClient.length || // Проверяем, что есть хоть один клиент
    !newDoc.value.OrderStage ||
    !newDoc.value.OrderPaymentStatus ||
    (newDoc.value.OrderDealNumber && !newDoc.value.OrderDealDate)
  ) {
    addError.value = 'Пожалуйста, заполните все обязательные поля.'
    highlightRequiredFields()
    return
  }
  try {
    const payload = { ...normalizeDocDates(newDoc.value) }
    payload.OrderNotes = newDoc.value.OrderNotes || ''
    const resp = await fetch('https://workdocs.codequartz.ru/api/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!resp.ok) throw new Error('Ошибка при добавлении заявки')
    showAddModal.value = false
    enableBodyScroll()
    Object.assign(newDoc.value, {
      OrderDealNumber: '',
      OrderDealDate: '',
      OrderAdress: '',
      OrderDate: '',
      OrderClient: [{ phone: '', name: '' }],
      OrderFieldwork: '',
      OrderStage: '',
      OrderPaymentStatus: 'Неоплачено',
      OrderNotes: '',
    })
    await fetchDocs()
    alert('Заявка добавлена!')
  } catch (e) {
    addError.value = e.message || 'Ошибка при добавлении заявки'
  }
}

function openEditModal(doc) {
  // Клонируем заявку для редактирования
  editDocData.value = { ...doc }
  originalDealNumber.value = doc.OrderDealNumber || ''
  // Корректно инициализируем массив клиентов
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

// Функции для управления прокруткой body
function disableBodyScroll() {
  document.body.style.overflow = 'hidden'
}

function enableBodyScroll() {
  document.body.style.overflow = ''
}

// Функции для закрытия модальных окон
function closeAddModal() {
  showAddModal.value = false
  enableBodyScroll()
}

function closeEditModal() {
  showEditModal.value = false
  enableBodyScroll()
}

// Функции для управления размером модального окна
function loadModalWidth() {
  const saved = localStorage.getItem('modalWidth')
  if (saved) {
    modalWidth.value = parseInt(saved)
  }
}

function saveModalWidth(width) {
  modalWidth.value = Math.max(400, Math.min(1200, width))
  localStorage.setItem('modalWidth', modalWidth.value.toString())
}

function handleModalResize(event) {
  if (event.target.classList.contains('modal-window')) {
    const rect = event.target.getBoundingClientRect()
    saveModalWidth(rect.width)
  }
}

// Функции для редактирования заметок
function startNotesEdit(orderNum, currentNotes) {
  editingNotes.value[orderNum] = currentNotes || ''
  notesEditMode.value[orderNum] = true
}

function cancelNotesEdit(orderNum) {
  notesEditMode.value[orderNum] = false
  delete editingNotes.value[orderNum]
}

async function saveNotes(orderNum) {
  try {
    // Находим заявку в локальном состоянии
    const docIndex = docs.value.findIndex((doc) => doc.OrderNum === orderNum)
    if (docIndex === -1) {
      throw new Error('Заявка не найдена')
    }

    const doc = docs.value[docIndex]

    // Создаем полный payload для PUT запроса
    const payload = {
      OrderDealNumber: doc.OrderDealNumber || null,
      OrderDealDate: doc.OrderDealDate || null,
      OrderAdress: doc.OrderAdress,
      OrderDate: doc.OrderDate,
      OrderClient: doc.OrderClient,
      OrderFieldwork: doc.OrderFieldwork || null,
      OrderStage: doc.OrderStage,
      OrderPaymentStatus: doc.OrderPaymentStatus,
      OrderNotes: editingNotes.value[orderNum] || '',
    }

    const resp = await fetch(`https://workdocs.codequartz.ru/api/docs/${orderNum}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!resp.ok) throw new Error('Ошибка при сохранении заметок')

    // Обновляем данные в локальном состоянии
    docs.value[docIndex].OrderNotes = editingNotes.value[orderNum] || ''

    notesEditMode.value[orderNum] = false
    delete editingNotes.value[orderNum]

    alert('Заметки сохранены!')
  } catch (e) {
    alert(`Ошибка при сохранении заметок: ${e.message || 'Попробуйте еще раз'}`)
  }
}

// При открытии модального окна добавления заявки сбрасываем newDoc
function openAddModal() {
  newDoc.value = {
    OrderDealNumber: '',
    OrderDealDate: '',
    OrderAdress: '',
    OrderDate: '',
    OrderClient: [{ phone: '', name: '' }],
    OrderFieldwork: '',
    OrderStage: '',
    OrderPaymentStatus: 'Неоплачено',
    OrderNotes: '',
  }
  showAddModal.value = true
  addError.value = ''
  disableBodyScroll()
}

async function saveEditDoc() {
  editError.value = ''
  if (
    !editDocData.value.OrderAdress ||
    !editDocData.value.OrderDate ||
    !editDocData.value.OrderClient ||
    !editDocData.value.OrderClient.length || // Проверяем, что есть хоть один клиент
    !editDocData.value.OrderPaymentStatus ||
    (editDocData.value.OrderDealNumber && !editDocData.value.OrderDealDate)
  ) {
    editError.value = 'Пожалуйста, заполните все обязательные поля.'
    highlightRequiredFieldsEdit()
    return
  }
  try {
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

function addClient() {
  if (showAddModal.value) {
    newDoc.value.OrderClient.push({ phone: '', name: '' })
  } else if (showEditModal.value && editDocData.value.OrderClient) {
    editDocData.value.OrderClient.push({ phone: '', name: '' })
  }
}
function removeClient(index) {
  if (showAddModal.value) {
    if (newDoc.value.OrderClient.length > 1) newDoc.value.OrderClient.splice(index, 1)
  } else if (showEditModal.value && editDocData.value.OrderClient) {
    if (editDocData.value.OrderClient.length > 1) editDocData.value.OrderClient.splice(index, 1)
  }
}

function toggleTag(doc, tag) {
  // Преобразуем OrderStage в массив, если это строка
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

  // Переключаем тег
  const tagIndex = currentTags.indexOf(tag)
  if (tagIndex > -1) {
    currentTags.splice(tagIndex, 1) // Убираем тег
  } else {
    currentTags.push(tag) // Добавляем тег
  }

  // Сохраняем обратно в OrderStage
  doc.OrderStage = currentTags.length > 0 ? JSON.stringify(currentTags) : ''

  // Если это редактирование существующей заявки, сохраняем на сервере
  if (doc.OrderNum) {
    saveTagChanges(doc)
  }
}

// Вспомогательные нормализаторы для запроса на сервер
function normalizeOrderClientForServer(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
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

async function saveTagChanges(doc) {
  try {
    const payload = {
      OrderDealNumber: doc.OrderDealNumber || null,
      OrderAdress: doc.OrderAdress || '',
      OrderDate: toMoscowDateInput(doc.OrderDate) || null,
      OrderClient: normalizeOrderClientForServer(doc.OrderClient),
      OrderFieldwork: toMoscowDateInput(doc.OrderFieldwork) || null,
      OrderStage: normalizeOrderStageForServer(doc.OrderStage),
      OrderPaymentStatus: doc.OrderPaymentStatus || 'Неоплачено',
      OrderNotes: doc.OrderNotes || '',
    }

    const resp = await fetch(`https://workdocs.codequartz.ru/api/docs/${doc.OrderNum}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!resp.ok) {
      if (resp.status === 503) {
        const errData = await resp.json().catch(() => ({}))
        throw new Error(errData.message || 'Сервис БД временно недоступен')
      }
      const text = await resp.text()
      throw new Error(text || 'Ошибка при сохранении тегов')
    }

    alert('Теги обновлены!')
  } catch (e) {
    console.error('Ошибка сохранения тегов:', e)
    alert(`Ошибка: ${e.message || 'Ошибка при сохранении тегов'}`)
  }
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

function getDocTags(orderStage) {
  return normalizeOrderStageForServer(orderStage)
}

function isDocDone(doc) {
  const tags = normalizeOrderStageForServer(doc && doc.OrderStage)
  return Array.isArray(tags) && tags.includes('Выполнено')
}

// 30-дневный срок строго от даты заявки (OrderDate)
function parseDateYmd(d) {
  if (!d) return NaN
  if (typeof d === 'string') {
    const ymd = d.includes('T') ? d.split('T')[0] : d
    const t = new Date(ymd).getTime()
    return t
  }
  return new Date(d).getTime()
}
function getDealDaysLeft(doc) {
  if (!doc.OrderDealNumber || !doc.OrderDealDate) return null
  const start = parseDateYmd(doc.OrderDealDate)
  if (isNaN(start)) return null
  const deadline = start + 30 * 24 * 60 * 60 * 1000
  const diffDays = Math.ceil((deadline - Date.now()) / (24 * 60 * 60 * 1000))
  return diffDays
}
function getDealDaysLeftText(doc) {
  const d = getDealDaysLeft(doc)
  if (d === null) return ''
  if (d <= 0) return 'Срок истёк'
  if (d === 1) return 'Остался 1 день'
  if (d >= 2 && d <= 4) return `Осталось ${d} дня`
  return `Осталось ${d} дней`
}
function getDealDeadlineClass(doc) {
  const d = getDealDaysLeft(doc)
  if (d === null) return ''
  if (d <= 0) return 'deadline-overdue'
  if (d <= 7) return 'deadline-soon'
  return 'deadline-ok'
}
function getDealDeadlineStyle(doc) {
  const d = getDealDaysLeft(doc)
  if (d === null) return {}
  if (d <= 0) {
    return { background: '#ffeaea', color: '#c53030', border: '1px solid #ffc2c2' }
  }
  if (d <= 7) {
    return { background: '#fff7e6', color: '#995c00', border: '1px solid #ffd699' }
  }
  return { background: '#e7fff2', color: '#0f7a49', border: '1px solid #a6f0c8' }
}

// удалено: создание тестовых данных и кнопка

async function checkServerHealth() {
  try {
    const resp = await fetch('https://workdocs.codequartz.ru/api/health')
    if (!resp.ok) {
      throw new Error(`Сервер недоступен (статус: ${resp.status})`)
    }
    const data = await resp.json()
    const rawDb = data.database || data.databaseStatus || 'нет данных'
    const rawSrv = data.status || data.serverStatus || 'нет данных'

    // Переводим статусы на русский
    const dbText =
      rawDb === 'connected' ? 'подключена' : rawDb === 'disconnected' ? 'недоступна' : rawDb
    const srvText =
      rawSrv === 'healthy' ? 'работает' : rawSrv === 'unhealthy' ? 'не работает' : rawSrv

    alert(`Сервер здоров! База данных: ${dbText}, Сервер: ${srvText}`)
  } catch (e) {
    alert(`Ошибка: Сервер недоступен: ${e.message}`)
  }
}

// Функции для подсветки обязательных полей
function highlightRequiredFields() {
  // Убираем предыдущие подсветки
  document.querySelectorAll('.field-error').forEach((el) => el.classList.remove('field-error'))

  // Подсвечиваем пустые поля
  if (!newDoc.value.OrderAdress) {
    const field = document.querySelector('input[v-model="newDoc.OrderAdress"]')
    if (field) field.classList.add('field-error')
  }
  if (!newDoc.value.OrderDate) {
    const field = document.querySelector('input[v-model="newDoc.OrderDate"]')
    if (field) field.classList.add('field-error')
  }
  if (!newDoc.value.OrderClient || !newDoc.value.OrderClient.length) {
    const fields = document.querySelectorAll('.client-input')
    fields.forEach((field) => field.classList.add('field-error'))
  }
  if (!newDoc.value.OrderStage) {
    const tagsContainer = document.querySelector('.tags-container')
    if (tagsContainer) tagsContainer.classList.add('field-error')
  }
  if (!newDoc.value.OrderPaymentStatus) {
    const field = document.querySelector('select[v-model="newDoc.OrderPaymentStatus"]')
    if (field) field.classList.add('field-error')
  }
  if (newDoc.value.OrderDealNumber && !newDoc.value.OrderDealDate) {
    const field = document.querySelector('input[v-model="newDoc.OrderDealDate"]')
    if (field) field.classList.add('field-error')
  }

  // Убираем подсветку через 3 секунды
  setTimeout(() => {
    document.querySelectorAll('.field-error').forEach((el) => el.classList.remove('field-error'))
  }, 3000)
}

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
  loadModalWidth()
})
watch(docs, (newDocs) => {
  // При обновлении заявок загружаем вложения
  for (const doc of newDocs) {
    fetchAttachments(doc.OrderNum)
  }
})

watch(modalWidth, (newWidth) => {
  localStorage.setItem('modalWidth', newWidth.toString())
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
.doc-header-files {
  color: #64748b;
  font-size: 0.98em;
}
/* Чипы тегов в заголовке карточки */
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
/* Дедлайн по договору */
.deal-date {
  color: #64748b;
  font-weight: 600;
  margin-left: 8px;
}
.deal-deadline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-left: 10px;
  height: 26px;
  padding: 0 12px;
  border-radius: 9999px;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  letter-spacing: 0.02em;
}
.deal-deadline.deadline-ok {
  background: #e7fff2;
  color: #0f7a49;
  border: 1px solid #a6f0c8;
}
.deal-deadline.deadline-soon {
  background: #fff7e6;
  color: #995c00;
  border: 1px solid #ffd699;
}
.deal-deadline.deadline-overdue {
  background: #ffeaea;
  color: #c53030;
  border: 1px solid #ffc2c2;
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
.beautiful-upload-form {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
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
.file-category {
  font-size: 0.98em;
  color: #64748b;
  margin-right: 4px;
}
.file-link-name {
  color: #2563eb;
  text-decoration: underline;
  font-size: 0.98em;
  /* Одной строкой с троеточием, без разбиения на символы */
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
.delete-btn {
  color: #e53e3e;
}
.delete-btn:hover {
  background: #ffeaea;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.add-btn {
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 10px 20px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(116, 182, 255, 0.25);
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-btn:hover {
  background: linear-gradient(135deg, #0984e3 0%, #0652dd 100%);
  box-shadow: 0 6px 20px rgba(116, 182, 255, 0.35);
  transform: translateY(-1px);
}

.add-btn.compact {
  padding: 8px 16px;
  font-size: 0.95rem;
  border-radius: 10px;
  height: 38px;
}

.add-icon {
  font-size: 1.1em;
  font-weight: 700;
}

.add-text {
  font-size: 0.95rem;
  font-weight: 500;
}
.doc-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.edit-btn {
  color: #3b82f6;
}
.edit-btn:hover {
  background: #eaf2ff;
}
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

@media (max-width: 480px) {
  .modal-overlay {
    padding: 0;
    align-items: stretch;
  }
}

/* Стили для плавающих кнопок-иконок */
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
  position: relative;
  overflow: hidden;
}

.floating-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 50%;
  transition: all 0.3s ease;
  z-index: -1;
}

.floating-btn.add-btn,
.floating-btn.save-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.floating-btn.add-btn::before,
.floating-btn.save-btn::before {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  opacity: 0;
}

.floating-btn.cancel-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.floating-btn.cancel-btn::before {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  opacity: 0;
}

.floating-btn:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow:
    0 12px 35px rgba(0, 0, 0, 0.2),
    0 8px 20px rgba(0, 0, 0, 0.15);
}

.floating-btn:hover::before {
  opacity: 1;
}

.floating-btn:active {
  transform: translateY(0) scale(0.95);
}

.floating-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.floating-btn:disabled:hover {
  transform: none;
  box-shadow:
    0 8px 25px rgba(0, 0, 0, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Белые иконки для плавающих кнопок */
.floating-btn span {
  color: white !important;
  filter: brightness(0) invert(1);
}

.floating-btn:disabled span {
  color: rgba(255, 255, 255, 0.6) !important;
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

/* Баннер для просроченных заявок */
.alert-banner {
  margin-bottom: 20px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.alert-banner-overdue {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
  animation: pulse 2s infinite;
}

.alert-banner-urgent {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
  animation: pulse 2s infinite;
}

.alert-icon {
  font-size: 1.2em;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.alert-text {
  flex: 1;
}

.alert-text strong {
  font-size: 1.1em;
  font-weight: 700;
}

.alert-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1em;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.alert-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

/* Индикатор активного фильтра */
.active-filter-indicator {
  margin-bottom: 20px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.filter-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-badge {
  color: white;
  font-weight: 500;
  font-size: 0.95em;
  padding: 6px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
}

.filter-badge.overdue {
  background: rgba(220, 38, 38, 0.8);
}

.filter-badge.urgent {
  background: rgba(245, 158, 11, 0.8);
}

.clear-filter-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.clear-filter-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

/* Анимация появления кнопок */
.floating-action-buttons {
  animation: slideInUp 0.4s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(100px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Адаптивность для плавающих кнопок */
@media (max-width: 768px) {
  .floating-action-buttons {
    bottom: 15px;
    right: 15px;
    gap: 10px;
  }

  .floating-btn {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .floating-action-buttons {
    bottom: 10px;
    right: 10px;
    gap: 8px;
  }

  .floating-btn {
    width: 45px;
    height: 45px;
    font-size: 18px;
  }
}

@media (max-width: 360px) {
  .floating-action-buttons {
    bottom: 8px;
    right: 8px;
    gap: 6px;
  }

  .floating-btn {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
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
  resize: horizontal;
}

.modal-window:hover .resize-handle {
  opacity: 1;
}

.modal-window::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent);
}

.modal-window::after {
  content: '';
  position: absolute;
  bottom: 15px;
  right: 15px;
  width: 16px;
  height: 16px;
  background:
    radial-gradient(circle at 2px 2px, rgba(156, 163, 175, 0.6) 1px, transparent 1px),
    radial-gradient(circle at 6px 6px, rgba(156, 163, 175, 0.4) 1px, transparent 1px),
    radial-gradient(circle at 10px 10px, rgba(156, 163, 175, 0.2) 1px, transparent 1px),
    radial-gradient(circle at 14px 14px, rgba(156, 163, 175, 0.1) 1px, transparent 1px);
  background-size: 4px 4px;
  background-position:
    0 0,
    0 0,
    0 0,
    0 0;
  opacity: 0;
  transition: all 0.3s ease;
  cursor: nw-resize;
  z-index: 10;
  border-radius: 2px;
}

.modal-window:hover::after {
  opacity: 1;
  transform: scale(1.1);
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

/* Адаптивность для модального окна */
@media (max-width: 900px) {
  .add-form {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .modal-window {
    width: 95vw !important;
    min-width: 400px;
  }
}

@media (max-width: 768px) {
  .modal-window {
    width: 98vw !important;
    min-width: unset;
    max-width: 98vw;
    padding: 20px 16px 0 16px;
    border-radius: 16px;
  }

  .modal-window h2 {
    font-size: 1.5rem;
    margin-bottom: 20px;
  }

  .size-controls {
    display: none;
  }

  /* Адаптивные стили modal-actions удалены */

  .add-form input,
  .add-form select,
  .add-form textarea {
    padding: 10px 12px;
    font-size: 16px; /* Предотвращает зум на iOS */
  }
}

@media (max-width: 480px) {
  .modal-window {
    width: 100vw !important;
    height: 100vh !important;
    max-height: 100vh !important;
    border-radius: 0;
    padding: 16px 12px 0 12px;
  }

  .modal-window h2 {
    font-size: 1.3rem;
    margin-bottom: 16px;
  }

  .add-form {
    gap: 12px;
    margin-top: 12px;
  }

  .add-form label span,
  .add-form .client-section span,
  .add-form .tags-section span {
    font-size: 0.9rem;
  }

  /* Адаптивные стили modal-actions удалены */

  .client-row {
    gap: 8px;
    margin-bottom: 8px;
  }

  .add-client-btn {
    padding: 8px 16px;
    font-size: 0.9rem;
  }

  .tags-container {
    gap: 8px;
  }

  .tag {
    padding: 6px 12px;
    font-size: 0.85rem;
  }
}

@media (max-width: 360px) {
  .modal-window {
    padding: 12px 8px 0 8px;
  }

  .modal-window h2 {
    font-size: 1.2rem;
    margin-bottom: 12px;
  }

  .add-form {
    gap: 10px;
    margin-top: 10px;
  }

  /* Адаптивные стили modal-actions удалены */

  .add-form input,
  .add-form select,
  .add-form textarea {
    padding: 8px 10px;
    font-size: 14px;
  }
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

/* Поля, которые должны занимать всю ширину */
.add-form label.full-width {
  grid-column: 1 / -1;
}

/* Специальные правила для клиентов */
.add-form .client-section {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.add-form .client-section span {
  color: #374151;
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: 0.025em;
}

/* Специальные правила для тегов */
.add-form .tags-section {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.add-form .tags-section span {
  color: #374151;
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: 0.025em;
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

.add-form input:hover,
.add-form select:hover,
.add-form textarea:hover {
  border-color: rgba(59, 130, 246, 0.4);
  box-shadow:
    0 4px 12px rgba(59, 130, 246, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transform: translateY(-1px);
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
/* Старые стили modal-actions удалены - кнопки вынесены за пределы модального окна */
/* Все стили modal-actions удалены */

/* Все стили modal-actions удалены - кнопки вынесены за пределы модального окна */
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

/* Адаптивность для клиентских полей */
@media (max-width: 480px) {
  .client-row {
    gap: 8px;
    margin-bottom: 8px;
  }

  .client-input {
    padding: 8px 10px;
    font-size: 14px;
  }

  .remove-client-btn {
    padding: 6px 8px;
    font-size: 0.8rem;
  }
}

@media (max-width: 360px) {
  .client-row {
    gap: 6px;
    margin-bottom: 6px;
  }

  .client-input {
    padding: 6px 8px;
    font-size: 13px;
  }

  .remove-client-btn {
    padding: 4px 6px;
    font-size: 0.7rem;
  }
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
  position: relative;
  overflow: hidden;
}

.add-client-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.add-client-btn:hover::before {
  left: 100%;
}

.add-client-btn:hover {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  box-shadow:
    0 6px 20px rgba(59, 130, 246, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.upload-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 2px solid #74b9ff;
  background: #fff;
  color: #74b9ff;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-btn:hover {
  background: #74b9ff;
  color: #fff;
  border-color: #74b9ff;
  transform: translateY(-1px);
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
.details-row label .status-input,
.details-row label .beautiful-select {
  width: 380px;
  max-width: 100%;
  min-width: 220px;
  box-sizing: border-box;
}

/* Поле вложений, чтобы не перехватывало клики как label */
.attachments-field span {
  display: inline-block;
  min-width: 140px;
  margin-right: 18px;
  color: #3b82f6;
  font-weight: 500;
  vertical-align: middle;
}

/* Новые стили для поиска */
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

/* Стили для тегов */
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

/* Адаптивность для тегов */
@media (max-width: 480px) {
  .tags-container {
    gap: 8px;
  }

  .tag {
    padding: 6px 12px;
    font-size: 0.85rem;
    border-radius: 16px;
  }
}

@media (max-width: 360px) {
  .tags-container {
    gap: 6px;
  }

  .tag {
    padding: 5px 10px;
    font-size: 0.8rem;
    border-radius: 14px;
  }
}

/* Стили для файлов */
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

.download-all-btn:active {
  transform: translateY(0);
}

/* Стили для кнопок синхронизации */
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

.sync-btn:active {
  transform: translateY(0);
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

.sync-all-btn:active {
  transform: translateY(0);
}

.files-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Адаптивность для файлов */
@media (max-width: 480px) {
  .files-header {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }

  .download-all-btn {
    width: 100%;
    padding: 10px 16px;
    font-size: 0.9rem;
  }

  .sync-btn {
    width: 100%;
    padding: 10px 16px;
    font-size: 0.9rem;
  }

  .files-actions {
    flex-direction: column;
    width: 100%;
    gap: 8px;
  }
}

.tags-label-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.tags-label-row label {
  font-weight: 600;
  color: #475569;
  letter-spacing: 0.02em;
}

/* Кнопка сброса — визуально как чип, но красный */
.clear-tags-btn {
  background: linear-gradient(135deg, #ff7878 0%, #e63946 100%);
  border: 1px solid rgba(230, 57, 70, 0.3);
  color: #fff;
  font-size: 0.92rem;
  padding: 6px 14px;
  height: 36px;
  border-radius: 9999px;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    background 0.2s ease,
    filter 0.2s ease;
  box-shadow: 0 6px 16px rgba(230, 57, 70, 0.25);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.clear-tags-btn::before {
  content: '✕';
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  margin-right: 8px;
  font-weight: 700;
  line-height: 1;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}
.clear-tags-btn:hover {
  background: linear-gradient(135deg, #e94646 0%, #c71f2d 100%);
  box-shadow: 0 10px 22px rgba(230, 57, 70, 0.35);
  transform: translateY(-2px);
}
.clear-tags-btn:active {
  transform: translateY(-1px) scale(0.98);
  filter: saturate(1.05);
}
.clear-tags-btn:focus-visible {
  outline: 2px solid rgba(231, 76, 60, 0.5);
  outline-offset: 2px;
}

/* Чипы тегов */
.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  color: #445269;
  border: 2px solid #dbe3ef;
  border-radius: 9999px;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
  user-select: none;
  min-width: 92px;
  text-align: center;
}
/* Явно фиксируем цвет для НЕактивных чипов */
.tag:not(.active) {
  color: #445269 !important;
}
.tag:hover {
  background: #f1f6ff;
  color: #1f3a8a;
  border-color: #bcd2ff;
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(59, 130, 246, 0.18);
}
.tag:focus-visible {
  outline: 2px solid rgba(59, 130, 246, 0.5);
  outline-offset: 2px;
}

.tag.active {
  position: relative;
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
  color: #ffffff;
  border-color: #74b9ff;
  box-shadow: 0 10px 26px rgba(59, 130, 246, 0.35);
  font-weight: 700;
  padding-left: 34px;
}
.tag-done {
  background: #e7fff2;
  color: #0f7a49;
  border-color: #a6f0c8;
}
.tag-done-active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
  border-color: #10b981 !important;
  box-shadow: 0 10px 26px rgba(16, 185, 129, 0.35) !important;
}
.tag-done-active::before {
  background: #ffffff !important;
  color: #0f766e !important;
}

.stage-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.stage-row span:first-child {
  margin-bottom: 8px;
  font-weight: 600;
  color: #ffffff;
}
/* удалено: стили кнопки создания тестовых данных */

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

.selected-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.selected-tags-label {
  font-size: 0.9em;
  color: #64748b;
  font-weight: 500;
}
.selected-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 10px;
  background: #eaf2ff;
  color: #1f3a8a;
  border: 1px solid #bcd2ff;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.12);
}
</style>
