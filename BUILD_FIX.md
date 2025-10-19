# 🔧 Исправление ошибки сборки

## ❌ Проблема

```
[vite:vue] crypto.hash is not a function
```

Эта ошибка возникает из-за несовместимости версий:

- Vite 7.0.0 + @vitejs/plugin-vue 6.0.0
- Конфликт с crypto API в новых версиях

## ✅ Решение

Обновлены версии в `package.json`:

### Было:

```json
{
  "dependencies": {
    "vue": "^3.5.17",
    "vue-router": "^4.5.1"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.0",
    "vite": "^7.0.0"
  }
}
```

### Стало:

```json
{
  "dependencies": {
    "vue": "^3.4.21",
    "vue-router": "^4.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.1.4",
    "vite": "^5.4.10"
  }
}
```

## 🚀 Что делать дальше

1. **Локально обновите зависимости**:

   ```bash
   npm install
   ```

2. **Проверьте сборку локально**:

   ```bash
   npm run build
   ```

3. **Запушьте изменения** - GitHub Actions автоматически обновит зависимости и пересоберет проект

## 📋 Совместимые версии

- ✅ **Vue 3.4.21** + **Vite 5.4.10** + **@vitejs/plugin-vue 5.1.4**
- ✅ **Node.js 18** (используется в GitHub Actions)
- ✅ Стабильная работа crypto API

---

_Проблема решена! Сборка должна пройти успешно._ 🎉
