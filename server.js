import express from 'express'
import mariadb from 'mariadb'
// import bcrypt from 'bcrypt'
// import jwt from 'jsonwebtoken'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import iconv from 'iconv-lite'
import si from 'systeminformation'
import archiver from 'archiver'
import { fileURLToPath } from 'url'

// Исправляем __dirname для ES модулей
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = process.env.PORT || 3001
const host = process.env.HOST || '0.0.0.0' // Слушаем на всех интерфейсах

// Настройка CORS для продакшн
const corsOptions = {
  origin:
    process.env.NODE_ENV === 'production'
      ? ['https://workdocs.codequartz.ru']
      : 'http://localhost:5173',
  credentials: true,
}
app.use(cors(corsOptions))

// Простое логирование запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`)
  next()
})

const pool = mariadb.createPool({
  host: '45.93.200.116',
  user: 'WEB',
  password: 'rAwI7u28n7kIl1382a4ugIGe7awiT8',
  database: 'workdocs',
  port: 3306,
  connectionLimit: 5,
  allowPublicKeyRetrieval: true,
  ssl: false,
})

// Проверяем подключение к базе данных при запуске
async function testDatabaseConnection() {
  let conn
  try {
    console.log('[DB] Тестируем подключение к базе данных...')
    console.log('[DB] Параметры подключения:', {
      host: '45.93.200.116',
      user: 'WEB',
      database: 'workdocs',
    })

    conn = await pool.getConnection()
    console.log('[DB] Подключение к БД успешно установлено')

    // Проверяем, что таблица docs существует
    const tables = await conn.query('SHOW TABLES LIKE "docs"')
    console.log('[DB] Таблица docs найдена:', tables.length > 0)

    if (tables.length > 0) {
      // Проверяем количество записей
      const count = await conn.query('SELECT COUNT(*) as total FROM docs')
      console.log('[DB] Количество записей в таблице docs:', count[0].total)
    }
  } catch (err) {
    console.error('[DB][ERROR] Ошибка подключения к БД:', err.message)
    console.error('[DB][ERROR] Код ошибки:', err.errno)
    console.error('[DB][ERROR] SQL State:', err.sqlState)

    // Проверяем доступность сервера БД
    if (err.errno === 45028) {
      console.error('[DB][ERROR] Таймаут подключения - возможно, сервер БД недоступен')
    } else if (err.errno === 2002) {
      console.error('[DB][ERROR] Не удается подключиться к серверу БД - проверьте IP и порт')
    } else if (err.errno === 1045) {
      console.error('[DB][ERROR] Ошибка аутентификации - проверьте логин/пароль')
    } else if (err.errno === 1049) {
      console.error('[DB][ERROR] База данных не существует')
    }
  } finally {
    if (conn) conn.release()
  }
}

// Запускаем проверку при старте сервера
testDatabaseConnection().catch((err) => {
  console.error('[DB][CONNECTION][STARTUP ERROR]', err)
})

// Автоинициализация схемы БД: создаём таблицы и недостающие колонки
async function ensureDatabaseSchema() {
  let conn
  try {
    conn = await pool.getConnection()

    // Создаём таблицу docs, если её нет
    await conn.query(
      `CREATE TABLE IF NOT EXISTS docs (
        OrderNum INT AUTO_INCREMENT PRIMARY KEY,
        OrderDealNumber VARCHAR(255) NULL,
        OrderDealDate DATE NULL,
        OrderAdress VARCHAR(512) NOT NULL,
        OrderDate DATE NULL,
        OrderClient TEXT NULL,
        OrderFieldwork DATE NULL,
        OrderStage TEXT NULL,
        OrderPaymentStatus VARCHAR(64) NOT NULL DEFAULT 'Неоплачено',
        OrderUncludes TEXT NULL,
        OrderNotes TEXT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    )

    // Создаём таблицу users, если её нет
    await conn.query(
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        login VARCHAR(255) NOT NULL UNIQUE,
        passwd VARCHAR(255) NOT NULL,
        role VARCHAR(64) NOT NULL DEFAULT 'user'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    )

    // Создаём таблицу attachments, если её нет
    await conn.query(
      `CREATE TABLE IF NOT EXISTS attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_num INT NOT NULL,
        file_path VARCHAR(1024) NOT NULL,
        file_name VARCHAR(512) NOT NULL,
        category VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    )

    // Добавляем недостающие колонки в docs (на случай старой схемы)
    await conn.query('ALTER TABLE docs ADD COLUMN IF NOT EXISTS OrderDealNumber VARCHAR(255) NULL')
    await conn.query('ALTER TABLE docs ADD COLUMN IF NOT EXISTS OrderDealDate DATE NULL')
    await conn.query('ALTER TABLE docs ADD COLUMN IF NOT EXISTS OrderAdress VARCHAR(512) NOT NULL')
    await conn.query('ALTER TABLE docs ADD COLUMN IF NOT EXISTS OrderDate DATE NULL')
    await conn.query('ALTER TABLE docs ADD COLUMN IF NOT EXISTS OrderClient TEXT NULL')
    await conn.query('ALTER TABLE docs ADD COLUMN IF NOT EXISTS OrderFieldwork DATE NULL')
    await conn.query('ALTER TABLE docs ADD COLUMN IF NOT EXISTS OrderStage TEXT NULL')
    await conn.query(
      "ALTER TABLE docs ADD COLUMN IF NOT EXISTS OrderPaymentStatus VARCHAR(64) NOT NULL DEFAULT 'Неоплачено'",
    )
    await conn.query('ALTER TABLE docs ADD COLUMN IF NOT EXISTS OrderUncludes TEXT NULL')
    await conn.query('ALTER TABLE docs ADD COLUMN IF NOT EXISTS OrderNotes TEXT NULL')

    // Добавляем недостающие колонки в attachments (на случай старой схемы)
    await conn.query('ALTER TABLE attachments ADD COLUMN IF NOT EXISTS category VARCHAR(255) NULL')
    await conn.query(
      'ALTER TABLE attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
    )

    console.log('[DB] Схема базы данных проверена/обновлена (docs/users/attachments)')
  } catch (err) {
    console.error('[DB][SCHEMA][ERROR]', err)
  } finally {
    if (conn) conn.release()
  }
}

ensureDatabaseSchema().catch((err) => {
  console.error('[DB][SCHEMA][STARTUP ERROR]', err)
})

// Удаляем JWT_SECRET и authenticateToken

// Простая обработка JSON
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Локальная папка для загрузок рядом с приложением
const uploadDir = path.resolve('uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

// Настройка multer для загрузки файлов с orderNum
const storageWithOrderNum = multer.diskStorage({
  destination: (req, file, cb) => {
    const orderNum = req.params.orderNum || req.params.OrderNum
    if (!orderNum) {
      return cb(new Error('Не передан номер заявки (orderNum)'), null)
    }
    const dir = path.join(uploadDir, orderNum)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)

    // Исправляем кодировку имени файла
    let originalName = file.originalname
    try {
      // Пытаемся исправить кодировку, если имя файла содержит некорректные символы
      if (originalName.includes('Ð') || originalName.includes('Ñ')) {
        originalName = iconv.decode(Buffer.from(originalName, 'binary'), 'utf8')
      }
    } catch (e) {
      console.log('Не удалось исправить кодировку в filename:', originalName)
    }

    cb(null, unique + '-' + originalName)
  },
})

// Фильтр для проверки загружаемых файлов
const fileFilter = (req, file, cb) => {
  // Разрешенные типы файлов (по mimetype)
  const allowedTypes = [
    // Изображения
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/heic',
    'image/heif',
    'image/bmp',
    'image/tiff',
    // Документы
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'application/xml',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/rtf',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    // Архивы
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/vnd.rar',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip',
    'application/x-bzip2',
    'application/x-xz',
    // Аудио/видео (небольшие вложения)
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/aac',
    'audio/flac',
    'audio/webm',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm',
  ]

  // Резервная проверка по расширению (на случай некорректного mimetype)
  const allowedExtensions = new Set([
    // Изображения
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.svg',
    '.heic',
    '.heif',
    '.bmp',
    '.tif',
    '.tiff',
    // Документы
    '.pdf',
    '.txt',
    '.md',
    '.csv',
    '.json',
    '.xml',
    '.rtf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.odt',
    '.ods',
    '.odp',
    '.ppt',
    '.pptx',
    // Архивы
    '.zip',
    '.rar',
    '.7z',
    '.tar',
    '.gz',
    '.bz2',
    '.xz',
    // Аудио/видео
    '.mp3',
    '.wav',
    '.ogg',
    '.aac',
    '.flac',
    '.webm',
    '.mp4',
    '.mov',
    '.avi',
    '.mkv',
  ])

  const ext = path.extname((file.originalname || '').toLowerCase())

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.has(ext)) {
    cb(null, true)
  } else {
    console.log(
      `[SECURITY] Заблокирован файл: mimetype=${file.mimetype}, name=${file.originalname}`,
    )
    cb(new Error('Тип файла не разрешен'), false)
  }
}

// Настройка multer для загрузки файлов без orderNum (старый эндпоинт)
const storageWithoutOrderNum = multer.diskStorage({
  destination: (req, file, cb) => {
    const orderNum = req.body.orderNum || req.query.orderNum
    if (!orderNum) {
      return cb(new Error('Не передан номер заявки (orderNum)'), null)
    }
    const dir = path.join(uploadDir, orderNum)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, unique + '-' + file.originalname)
  },
})

const uploadWithOrderNum = multer({
  storage: storageWithOrderNum,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB максимум
    files: 10, // максимум 10 файлов за раз
  },
})
const uploadWithoutOrderNum = multer({
  storage: storageWithoutOrderNum,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB максимум
    files: 10, // максимум 10 файлов за раз
  },
})

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body
  console.log(`[LOGIN] Попытка входа пользователя: ${username}`)
  let conn
  try {
    conn = await pool.getConnection()
    // Изменено: login и passwd вместо username и password
    const rows = await conn.query('SELECT * FROM users WHERE login = ?', [username])
    if (rows.length === 0) {
      console.log(`[LOGIN] Пользователь не найден: ${username}`)
      return res.status(401).json({ message: 'Пользователь не найден' })
    }
    const user = rows[0]
    if (user.passwd !== password) {
      console.log(`[LOGIN] Неверный пароль для пользователя: ${username}`)
      return res.status(401).json({ message: 'Неверный пароль' })
    }
    console.log(`[LOGIN] Успешный вход: ${username}`)
    res.json({ username, role: user.role })
  } catch (err) {
    console.log(`[LOGIN][ERROR] ${err}`)
    res.status(500).send(err.toString())
  } finally {
    if (conn) conn.release()
  }
})

app.get('/api/data', async (req, res) => {
  let conn
  console.log(`[DATA] Запрос данных (без авторизации)`)
  try {
    conn = await pool.getConnection()
    const rows = await conn.query('SELECT * FROM ваша_таблица')
    console.log(`[DATA] Данные успешно получены (${rows.length} строк)`)
    res.json(rows)
  } catch (err) {
    console.log(`[DATA][ERROR] ${err}`)
    res.status(500).send(err.toString())
  } finally {
    if (conn) conn.release()
  }
})

app.get('/api/docs', async (req, res) => {
  let conn
  try {
    console.log('[DOCS] Загрузка заявок...')
    conn = await pool.getConnection()

    // Загружаем все заявки
    const rows = await conn.query('SELECT * FROM docs ORDER BY OrderNum DESC')

    // Хелпер для нормализации дат к формату YYYY-MM-DD без смещения часового пояса
    const toYmdLocal = (val) => {
      if (!val) return null
      if (typeof val === 'string') return val.slice(0, 10)
      const d = new Date(val)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    // Преобразуем OrderClient и даты
    for (const row of rows) {
      if (typeof row.OrderClient === 'string') {
        try {
          row.OrderClient = JSON.parse(row.OrderClient)
        } catch {
          row.OrderClient = []
        }
      }
      if (!Array.isArray(row.OrderClient)) row.OrderClient = []

      // Также обрабатываем OrderStage для совместимости
      if (typeof row.OrderStage === 'string') {
        try {
          row.OrderStage = JSON.parse(row.OrderStage)
        } catch {
          // Если не JSON, оставляем как есть
          console.log('[DOCS] OrderStage не является JSON:', row.OrderStage)
        }
      }

      // Нормализуем поля дат как строки YYYY-MM-DD
      row.OrderDealDate = toYmdLocal(row.OrderDealDate)
      row.OrderDate = toYmdLocal(row.OrderDate)
      row.OrderFieldwork = toYmdLocal(row.OrderFieldwork)
      // Гарантируем наличие OrderNotes
      if (row.OrderNotes === undefined) row.OrderNotes = null
    }

    res.json(rows)
  } catch (err) {
    console.log(`[DOCS][ERROR] ${err.message}`)
    res.status(500).json({
      message: 'Ошибка загрузки заявок',
      error: err.message,
    })
  } finally {
    if (conn) conn.release()
  }
})

app.post('/api/docs', async (req, res) => {
  const {
    OrderDealNumber,
    OrderDealDate,
    OrderAdress,
    OrderDate,
    OrderClient,
    OrderFieldwork,
    OrderStage,
    OrderPaymentStatus,
    OrderNotes,
  } = req.body
  let conn
  try {
    conn = await pool.getConnection()

    // Обрабатываем OrderStage - если это массив, преобразуем в JSON
    let orderStageValue = OrderStage
    if (Array.isArray(OrderStage)) {
      orderStageValue = JSON.stringify(OrderStage)
    } else if (OrderStage && typeof OrderStage === 'string') {
      // Если это строка, проверяем, не JSON ли это
      try {
        JSON.parse(OrderStage)
        orderStageValue = OrderStage // Уже JSON
      } catch {
        orderStageValue = JSON.stringify([OrderStage]) // Преобразуем в массив
      }
    }

    const result = await conn.query(
      'INSERT INTO docs (OrderDealNumber, OrderDealDate, OrderAdress, OrderDate, OrderClient, OrderFieldwork, OrderStage, OrderPaymentStatus, OrderNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        OrderDealNumber || null,
        OrderDealDate || null,
        OrderAdress,
        OrderDate,
        JSON.stringify(OrderClient),
        OrderFieldwork || null,
        orderStageValue,
        OrderPaymentStatus,
        OrderNotes || null,
      ],
    )
    // Получаем только что созданную заявку (OrderNum - автоинкремент)
    const [created] = await conn.query('SELECT * FROM docs WHERE OrderNum = ?', [result.insertId])
    if (created) {
      const toYmdLocal = (val) => {
        if (!val) return null
        if (typeof val === 'string') return val.slice(0, 10)
        const d = new Date(val)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }
      created.OrderDealDate = toYmdLocal(created.OrderDealDate)
      created.OrderDate = toYmdLocal(created.OrderDate)
      created.OrderFieldwork = toYmdLocal(created.OrderFieldwork)
    }
    if (created) {
      if (created.OrderNotes === undefined) created.OrderNotes = null
    }
    res.status(201).json(created)
  } catch (err) {
    console.log('[DOCS][CREATE][ERROR]', err)
    res.status(500).json({ message: 'Ошибка при создании заявки', error: err.toString() })
  } finally {
    if (conn) conn.release()
  }
})

app.put('/api/docs/:OrderNum', async (req, res) => {
  const { OrderNum } = req.params
  const {
    OrderDealNumber,
    OrderDealDate,
    OrderAdress,
    OrderDate,
    OrderClient,
    OrderFieldwork,
    OrderStage,
    OrderPaymentStatus,
    OrderNotes,
  } = req.body
  console.log('BODY:', req.body)
  let conn
  try {
    conn = await pool.getConnection()

    // Обрабатываем OrderStage - если это массив, преобразуем в JSON
    let orderStageValue = OrderStage
    if (Array.isArray(OrderStage)) {
      orderStageValue = JSON.stringify(OrderStage)
    } else if (OrderStage && typeof OrderStage === 'string') {
      // Если это строка, проверяем, не JSON ли это
      try {
        JSON.parse(OrderStage)
        orderStageValue = OrderStage // Уже JSON
      } catch {
        orderStageValue = JSON.stringify([OrderStage]) // Преобразуем в массив
      }
    }

    const result = await conn.query(
      'UPDATE docs SET OrderDealNumber=?, OrderDealDate=?, OrderAdress=?, OrderDate=?, OrderClient=?, OrderFieldwork=?, OrderStage=?, OrderPaymentStatus=?, OrderNotes=? WHERE OrderNum=?',
      [
        OrderDealNumber || null,
        OrderDealDate || null,
        OrderAdress,
        OrderDate,
        JSON.stringify(OrderClient),
        OrderFieldwork || null,
        orderStageValue,
        OrderPaymentStatus,
        OrderNotes || null,
        OrderNum,
      ],
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Заявка не найдена' })
    }
    res.json({ success: true })
  } catch (err) {
    console.log('[DOCS][UPDATE][ERROR]', err)
    res.status(500).json({ message: 'Ошибка при обновлении заявки', error: err.toString() })
  } finally {
    if (conn) conn.release()
  }
})

// Функция смены этапа больше не нужна, так как используются теги
// app.put('/api/docs/:OrderNum/stage', async (req, res) => {
//   const { OrderNum } = req.params
//   const { stage } = req.body
//   let conn
//   try {
//     conn = await pool.getConnection()
//     const result = await conn.query('UPDATE docs SET OrderStage = ? WHERE OrderNum = ?', [
//       stage,
//       OrderNum,
//     ])
//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: 'Заявка не найдена' })
//     }
//     res.json({ success: true })
//   } catch (err) {
//     console.log(`[DOCS][STAGE][ERROR] ${err}`)
//     res.status(500).send(err.toString())
//   } finally {
//     if (conn) conn.release()
//   }
// })

app.post('/api/docs/:OrderNum/upload', uploadWithOrderNum.array('files'), async (req, res) => {
  const { OrderNum } = req.params
  const files = req.files
  const orderDir = path.join(uploadDir, OrderNum)
  if (!fs.existsSync(orderDir)) fs.mkdirSync(orderDir, { recursive: true })
  if (!files || files.length === 0) {
    console.log(`[UPLOAD][${OrderNum}] Нет файлов для загрузки`)
    return res.status(400).json({ message: 'Нет файлов' })
  }
  let conn
  try {
    conn = await pool.getConnection()
    // Получаем текущие OrderUncludes
    const rows = await conn.query('SELECT OrderUncludes FROM docs WHERE OrderNum = ?', [OrderNum])
    if (rows.length === 0) {
      console.log(`[UPLOAD][${OrderNum}] Заявка не найдена`)
      return res.status(404).json({ message: 'Заявка не найдена' })
    }
    let arr = []
    const current = rows[0].OrderUncludes
    if (Array.isArray(current)) {
      arr = current
    } else if (typeof current === 'string') {
      try {
        arr = JSON.parse(current)
        if (!Array.isArray(arr)) arr = []
      } catch {
        arr = []
      }
    }
    const links = files.map((f) => `/uploads/${OrderNum}/${f.filename}`)
    const updatedArr = arr.concat(links)
    const updated = JSON.stringify(updatedArr)
    await conn.query('UPDATE docs SET OrderUncludes = ? WHERE OrderNum = ?', [updated, OrderNum])
    console.log(`[UPLOAD][${OrderNum}] Файлы успешно загружены:`, links)
    res.json({ success: true, files: links })
  } catch (err) {
    console.log(`[UPLOAD][${OrderNum}][ERROR]`, err)
    res.status(500).json({ message: 'Ошибка сервера', error: err.toString() })
  } finally {
    if (conn) conn.release()
  }
})

app.get('/api/docs/:OrderNum/files', async (req, res) => {
  const { OrderNum } = req.params
  let conn
  try {
    conn = await pool.getConnection()
    const rows = await conn.query('SELECT OrderUncludes FROM docs WHERE OrderNum = ?', [OrderNum])
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Заявка не найдена' })
    }
    let files = []
    const raw = rows[0].OrderUncludes
    console.log('OrderUncludes из базы:', raw)
    if (Array.isArray(raw)) {
      files = raw
    } else if (typeof raw === 'string') {
      try {
        files = JSON.parse(raw)
        if (!Array.isArray(files)) files = []
      } catch {
        files = []
      }
    }
    console.log('Распарсенные файлы:', files)
    console.log('Отправляем в ответе:', files)
    res.json({ files })
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера', error: err.toString() })
  } finally {
    if (conn) conn.release()
  }
})

// Эндпоинт для массового скачивания файлов в ZIP архиве
app.post('/api/docs/:OrderNum/download-all', async (req, res) => {
  const { OrderNum } = req.params
  const { files } = req.body

  console.log(`[DOWNLOAD-ALL] Заявка ${OrderNum}, файлы:`, files)

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ message: 'Нет файлов для скачивания' })
  }

  try {
    const archive = archiver('zip', { zlib: { level: 9 } })

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="files_${OrderNum}.zip"`)

    // Обработчики событий архива
    archive.on('error', (err) => {
      console.error('Ошибка создания архива:', err)
      if (!res.headersSent) {
        res.status(500).json({ message: 'Ошибка создания архива' })
      }
    })

    archive.on('entry', (entry) => {
      console.log(`[DOWNLOAD-ALL] Добавлена запись в архив: ${entry.name}`)
    })

    archive.on('end', () => {
      console.log(`[DOWNLOAD-ALL] Архив завершен, размер: ${archive.pointer()} байт`)
    })

    archive.pipe(res)

    // Добавляем файлы в архив
    const conn = await pool.getConnection()
    try {
      console.log(`[DOWNLOAD-ALL] Обрабатываем ${files.length} файлов`)
      for (const filePath of files) {
        console.log(`[DOWNLOAD-ALL] Обрабатываем файл: ${filePath}`)

        // Собираем путь к файлу относительно локального каталога загрузок
        const fullPath = path.join(uploadDir, filePath.replace('/uploads/', ''))

        // Для архива будем исправлять только имя файла
        let correctedFilePath = filePath
        try {
          if (filePath.includes('Ð') || filePath.includes('Ñ')) {
            correctedFilePath = iconv.decode(Buffer.from(filePath, 'binary'), 'utf8')
            console.log(`[DOWNLOAD-ALL] Исправленный путь для архива: ${correctedFilePath}`)
          }
        } catch (e) {
          console.log('Не удалось исправить кодировку пути:', filePath)
        }
        console.log(`[DOWNLOAD-ALL] Полный путь к файлу: ${fullPath}`)
        console.log(`[DOWNLOAD-ALL] Файл существует: ${fs.existsSync(fullPath)}`)

        if (fs.existsSync(fullPath)) {
          // Получаем оригинальное имя файла из базы данных
          const [rows] = await conn.query('SELECT file_name FROM attachments WHERE file_path = ?', [
            filePath,
          ])
          let fileName = rows.length > 0 ? rows[0].file_name : path.basename(correctedFilePath)

          // Если не нашли в БД, попробуем найти по исправленному пути
          if (rows.length === 0) {
            const [rowsCorrected] = await conn.query(
              'SELECT file_name FROM attachments WHERE file_path = ?',
              [correctedFilePath],
            )
            if (rowsCorrected.length > 0) {
              fileName = rowsCorrected[0].file_name
            }
          }
          console.log(`[DOWNLOAD-ALL] Имя файла из БД: ${fileName}`)

          // Используем исправленное имя файла для архива
          let archiveFileName = path.basename(correctedFilePath)

          // Если есть имя из БД, используем его
          if (fileName && !fileName.includes('Ð') && !fileName.includes('Ñ')) {
            archiveFileName = fileName
          }

          console.log(`[DOWNLOAD-ALL] Имя файла для архива: ${archiveFileName}`)
          console.log(`[DOWNLOAD-ALL] Добавляем файл в архив: ${fullPath} -> ${archiveFileName}`)
          archive.file(fullPath, { name: archiveFileName })
          console.log(`[DOWNLOAD-ALL] Файл добавлен в архив: ${archiveFileName}`)
        } else {
          console.log(`[DOWNLOAD-ALL] Файл не найден: ${fullPath}`)
          console.log(`[DOWNLOAD-ALL] Проверяем директорию: ${path.dirname(fullPath)}`)
          console.log(
            `[DOWNLOAD-ALL] Содержимое директории:`,
            fs.readdirSync(path.dirname(fullPath)).slice(0, 5),
          )
        }
      }
    } catch (err) {
      console.error('Ошибка при обработке файлов для архива:', err)
      if (!res.headersSent) {
        return res.status(500).json({ message: 'Ошибка обработки файлов', error: err.message })
      }
    } finally {
      conn.release()
    }

    console.log(`[DOWNLOAD-ALL] Финализируем архив...`)
    archive.finalize()
    console.log(`[DOWNLOAD-ALL] Архив создан для заявки ${OrderNum}`)
  } catch (err) {
    console.error('Ошибка массового скачивания:', err)
    res.status(500).json({ message: 'Ошибка сервера', error: err.toString() })
  }
})

app.delete('/api/docs/:OrderNum/file', async (req, res) => {
  const { OrderNum } = req.params
  const { file } = req.body
  if (!file) return res.status(400).json({ message: 'Не указан файл' })
  let conn
  try {
    conn = await pool.getConnection()
    const rows = await conn.query('SELECT OrderUncludes FROM docs WHERE OrderNum = ?', [OrderNum])
    if (rows.length === 0) return res.status(404).json({ message: 'Заявка не найдена' })
    let arr = []
    const current = rows[0].OrderUncludes
    if (Array.isArray(current)) {
      arr = current
    } else if (typeof current === 'string') {
      try {
        arr = JSON.parse(current)
        if (!Array.isArray(arr)) arr = []
      } catch {
        arr = []
      }
    }
    const updatedArr = arr.filter((f) => f !== file)
    const updated = JSON.stringify(updatedArr)
    await conn.query('UPDATE docs SET OrderUncludes = ? WHERE OrderNum = ?', [updated, OrderNum])
    // Удаляем физически
    const filePath = path.join(uploadDir, file.replace('/uploads/', ''))
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера', error: err.toString() })
  } finally {
    if (conn) conn.release()
  }
})

app.delete('/api/docs/:OrderNum', async (req, res) => {
  const { OrderNum } = req.params
  let conn
  try {
    conn = await pool.getConnection()
    const result = await conn.query('DELETE FROM docs WHERE OrderNum = ?', [OrderNum])
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Заявка не найдена' })
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при удалении заявки', error: err.toString() })
  } finally {
    if (conn) conn.release()
  }
})

// Удалено: кастомная обработка txt-файлов

// Статические файлы ПОСЛЕ кастомной обработки
app.use(
  '/uploads',
  (req, res, next) => {
    if (req.path.endsWith('.txt')) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    }
    next()
  },
  express.static(uploadDir),
)

// Новый эндпоинт: загрузка файла (orderNum теперь в params)
app.post(
  '/api/attachments/upload/:orderNum',
  uploadWithOrderNum.single('file'),
  async (req, res) => {
    const { orderNum } = req.params
    const file = req.file
    if (!orderNum || !file) return res.status(400).json({ message: 'Нет заявки или файла' })
    let conn
    try {
      conn = await pool.getConnection()

      // Исправляем кодировку имени файла
      let originalName = file.originalname
      try {
        // Пытаемся исправить кодировку, если имя файла содержит некорректные символы
        if (originalName.includes('Ð') || originalName.includes('Ñ')) {
          originalName = iconv.decode(Buffer.from(originalName, 'binary'), 'utf8')
        }
      } catch (e) {
        console.log('Не удалось исправить кодировку имени файла:', originalName)
      }

      await conn.query(
        'INSERT INTO attachments (order_num, file_path, file_name, category) VALUES (?, ?, ?, ?)',
        [orderNum, `/uploads/${orderNum}/${file.filename}`, originalName, null],
      )
      res.json({ success: true })
    } catch (err) {
      res.status(500).json({ message: 'Ошибка сервера', error: err.toString() })
    } finally {
      if (conn) conn.release()
    }
  },
)

// Получить все вложения по заявке
app.get('/api/attachments/:orderNum', async (req, res) => {
  const { orderNum } = req.params
  let conn
  try {
    conn = await pool.getConnection()
    const rows = await conn.query('SELECT * FROM attachments WHERE order_num = ?', [orderNum])
    res.json({ attachments: rows })
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера', error: err.toString() })
  } finally {
    if (conn) conn.release()
  }
})

// Функция синхронизации файлов в папке с базой данных
async function syncFilesWithDatabase(orderNum) {
  let conn
  try {
    conn = await pool.getConnection()

    // Проверяем, существует ли заявка
    const orderExists = await conn.query('SELECT OrderNum FROM docs WHERE OrderNum = ?', [orderNum])
    if (orderExists.length === 0) {
      console.log(`[SYNC][${orderNum}] Заявка не найдена в базе данных`)
      return { success: false, message: 'Заявка не найдена' }
    }

    // Получаем список файлов из базы данных для этой заявки
    const dbFiles = await conn.query('SELECT file_path FROM attachments WHERE order_num = ?', [
      orderNum,
    ])
    const dbFilePaths = new Set(dbFiles.map((row) => row.file_path))

    // Получаем список файлов из папки
    const orderDir = path.join(uploadDir, orderNum.toString())
    if (!fs.existsSync(orderDir)) {
      console.log(`[SYNC][${orderNum}] Папка заявки не существует: ${orderDir}`)
      return { success: true, message: 'Папка заявки не существует', added: 0 }
    }

    const folderFiles = fs.readdirSync(orderDir)
    let addedCount = 0

    for (const fileName of folderFiles) {
      const filePath = `/uploads/${orderNum}/${fileName}`

      // Если файла нет в базе данных, добавляем его
      if (!dbFilePaths.has(filePath)) {
        try {
          // Исправляем кодировку имени файла
          let originalName = fileName
          try {
            if (fileName.includes('Ð') || fileName.includes('Ñ')) {
              originalName = iconv.decode(Buffer.from(fileName, 'binary'), 'utf8')
            }
          } catch (e) {
            console.log(`[SYNC][${orderNum}] Не удалось исправить кодировку файла: ${fileName}`)
          }

          await conn.query(
            'INSERT INTO attachments (order_num, file_path, file_name, category) VALUES (?, ?, ?, ?)',
            [orderNum, filePath, originalName, null],
          )

          console.log(`[SYNC][${orderNum}] Добавлен файл в БД: ${originalName}`)
          addedCount++
        } catch (err) {
          console.log(`[SYNC][${orderNum}] Ошибка добавления файла ${fileName}:`, err.message)
        }
      }
    }

    console.log(`[SYNC][${orderNum}] Синхронизация завершена. Добавлено файлов: ${addedCount}`)
    return { success: true, message: `Добавлено файлов: ${addedCount}`, added: addedCount }
  } catch (err) {
    console.log(`[SYNC][${orderNum}][ERROR]`, err)
    return { success: false, message: 'Ошибка синхронизации', error: err.toString() }
  } finally {
    if (conn) conn.release()
  }
}

// API эндпоинт для синхронизации файлов конкретной заявки
app.post('/api/attachments/sync/:orderNum', async (req, res) => {
  const { orderNum } = req.params
  console.log(`[SYNC][${orderNum}] Запрос синхронизации файлов`)

  const result = await syncFilesWithDatabase(orderNum)

  if (result.success) {
    res.json(result)
  } else {
    res.status(500).json(result)
  }
})

// API эндпоинт для синхронизации всех заявок
app.post('/api/attachments/sync-all', async (req, res) => {
  let conn
  try {
    conn = await pool.getConnection()

    // Получаем все номера заявок
    const orders = await conn.query('SELECT OrderNum FROM docs ORDER BY OrderNum')
    let totalAdded = 0
    const results = []

    for (const order of orders) {
      const result = await syncFilesWithDatabase(order.OrderNum)
      results.push({ orderNum: order.OrderNum, ...result })
      if (result.success) {
        totalAdded += result.added || 0
      }
    }

    console.log(
      `[SYNC-ALL] Синхронизация всех заявок завершена. Всего добавлено файлов: ${totalAdded}`,
    )
    res.json({
      success: true,
      message: `Синхронизация завершена. Добавлено файлов: ${totalAdded}`,
      totalAdded,
      results,
    })
  } catch (err) {
    console.log('[SYNC-ALL][ERROR]', err)
    res
      .status(500)
      .json({ success: false, message: 'Ошибка синхронизации всех заявок', error: err.toString() })
  } finally {
    if (conn) conn.release()
  }
})

// Удалить вложение по id
app.delete('/api/attachments/:id', async (req, res) => {
  const { id } = req.params
  let conn
  try {
    conn = await pool.getConnection()
    const rows = await conn.query('SELECT file_path, order_num FROM attachments WHERE id = ?', [id])
    if (rows.length === 0) return res.status(404).json({ message: 'Вложение не найдено' })
    const filePath = path.join(uploadDir, rows[0].file_path.replace('/uploads/', ''))
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    await conn.query('DELETE FROM attachments WHERE id = ?', [id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера', error: err.toString() })
  } finally {
    if (conn) conn.release()
  }
})

// Эндпоинт для получения системной информации
app.get('/api/system-info', async (req, res) => {
  try {
    console.log('[SYSTEM-INFO] Запрос системной информации')

    // Получаем информацию о дисках
    const diskLayout = await si.diskLayout()
    const fsSize = await si.fsSize()

    // Получаем информацию о памяти
    const mem = await si.mem()

    // Получаем информацию о процессоре
    const cpu = await si.cpu()

    // Получаем время работы системы
    const time = await si.time()

    // Получаем информацию о загрузке системы
    const currentLoad = await si.currentLoad()

    // Получаем информацию о сети
    const networkStats = await si.networkStats()

    // Получаем информацию о процессах
    const processes = await si.processes()

    const systemInfo = {
      timestamp: new Date().toISOString(),
      disks: {
        layout: diskLayout,
        usage: fsSize,
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        available: mem.available,
        usage: Math.round((mem.used / mem.total) * 100),
      },
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
        speed: cpu.speed,
        load: Math.round(currentLoad.currentLoad),
      },
      uptime: {
        uptime: time.uptime,
        uptimeFormatted: time.uptimeFormatted,
      },
      network: networkStats,
      processes: {
        all: processes.all,
        running: processes.running,
        blocked: processes.blocked,
        sleeping: processes.sleeping,
      },
    }

    console.log('[SYSTEM-INFO] Системная информация успешно получена')
    res.json(systemInfo)
  } catch (err) {
    console.error('[SYSTEM-INFO][ERROR]', err.message)
    res.status(500).json({
      message: 'Ошибка получения системной информации',
      error: err.message,
    })
  }
})

app.get('/api/ping', (req, res) => {
  console.log(`[PING] Тестовое соединение с сайта установлено`)
  res.json({ status: 'ok' })
})

// Обработка статики для продакшн
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist')
  const publicPath = path.join(process.cwd(), 'public')
  // Раздача статических файлов (JS/CSS/ico и др.)
  app.use(express.static(distPath))
  // Раздача файлов из папки public (иконки, манифест)
  app.use(
    express.static(publicPath, {
      maxAge: '1d', // Кеширование на 1 день
      etag: true,
    }),
  )

  // Специальная обработка favicon для избежания кеширования
  app.get('/favicon.ico', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.sendFile(path.join(process.cwd(), 'public', 'favicon.ico'))
  })
}

// удалено: эндпоинт для создания тестовых данных

// Эндпоинт для проверки состояния подключения к БД
app.get('/api/health', async (req, res) => {
  let conn
  try {
    conn = await pool.getConnection()
    await conn.query('SELECT 1')
    res.json({ status: 'ok' })
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message })
  } finally {
    if (conn) conn.release()
  }
})

// Эндпоинт для проверки состояния пула соединений
app.get('/api/pool-status', (req, res) => {
  const poolInfo = {
    totalConnections: pool.totalConnections,
    idleConnections: pool.idleConnections,
    activeConnections: pool.activeConnections,
    timestamp: new Date().toISOString(),
  }

  console.log('[POOL-STATUS]', poolInfo)
  res.json(poolInfo)
})

// SPA fallback маршрут - должен быть последним
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist')
  app.get('*splat', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(port, host, () => {
  console.log(`Сервер запущен на http://${host}:${port}`)
  console.log(`Доступен по адресу: https://workdocs.codequartz.ru`)
  // Проверка соединения с БД
  pool
    .getConnection()
    .then((conn) => {
      console.log('Успешное соединение с базой данных!')
      conn.release()
    })
    .catch((err) => {
      console.error('Ошибка соединения с базой данных:', err)
    })
})
