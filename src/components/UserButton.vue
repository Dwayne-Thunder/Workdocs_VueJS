<template>
  <div>
    <button class="user-btn" @click="showModal = true">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2" />
        <path d="M4 20c0-2.21 3.582-4 8-4s8 1.79 8 4" stroke="currentColor" stroke-width="2" />
      </svg>
    </button>
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <h3>Профиль</h3>
        <div class="info-row">
          <span>Имя:</span> <b>{{ username }}</b>
        </div>
        <div class="info-row">
          <span>Роль:</span> <b>{{ role }}</b>
        </div>
        <button class="logout-btn" @click="logout">Выйти</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const showModal = ref(false)
const router = useRouter()

// Для примера: имя и роль из localStorage (или заглушка)
const username = localStorage.getItem('username') || 'admin'
const role = localStorage.getItem('role') || 'Администратор'

function logout() {
  localStorage.removeItem('auth')
  localStorage.removeItem('username')
  localStorage.removeItem('role')
  router.push('/login')
}
</script>

<style scoped>
.user-btn {
  position: absolute;
  top: 0;
  right: 0;
  margin: 12px 18px 0 0;
  background: #fff;
  color: #3b82f6;
  border: 2px solid #e0e6ef;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px 0 rgba(59, 130, 246, 0.06);
  cursor: pointer;
  transition:
    background 0.2s,
    border 0.2s,
    color 0.2s;
}
.user-btn:hover {
  background: #e9eef5;
  color: #232b36;
  border: 2px solid #3b82f6;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}
.modal {
  background: #fff;
  color: #232b36;
  border-radius: 32px;
  box-shadow: 0 4px 24px 0 rgba(59, 130, 246, 0.1);
  padding: 36px 40px 28px 40px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  border: 2px solid #e0e6ef;
  transition:
    box-shadow 0.2s,
    border 0.2s,
    background 0.2s;
}
.modal h3 {
  font-family: 'Montserrat', Arial, sans-serif;
  color: #3b82f6;
  margin-bottom: 8px;
  font-size: 1.4rem;
}
.info-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  font-size: 1.1rem;
  margin-bottom: 6px;
}
.logout-btn {
  margin-top: 18px;
  padding: 10px 28px;
  border-radius: 18px;
  border: 2px solid #e74c3c;
  background: #fff;
  color: #e74c3c;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition:
    background 0.2s,
    border 0.2s,
    color 0.2s;
  box-shadow: 0 2px 8px 0 rgba(231, 76, 60, 0.06);
}
.logout-btn:hover {
  background: #ffeaea;
  color: #c0392b;
  border: 2px solid #c0392b;
}
@media (max-width: 700px) {
  .user-btn {
    width: 36px !important;
    height: 36px !important;
    margin: 0 auto 8px auto !important;
    display: flex;
  }
}
</style>
