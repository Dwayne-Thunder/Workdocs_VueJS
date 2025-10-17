<template>
  <aside class="sidebar">
    <div v-if="showUserButton" class="mobile-profile-block">
      <div class="profile-icon">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="5" stroke="#3b82f6" stroke-width="2.2" />
          <path d="M4 20c0-2.7 4.2-5 8-5s8 2.3 8 5" stroke="#3b82f6" stroke-width="2.2" />
        </svg>
      </div>
      <div class="profile-name">{{ username }}</div>
      <div class="profile-role">{{ role }}</div>
      <button class="profile-logout" @click="logout">Выйти</button>
    </div>
    <nav>
      <RouterLink to="/requests" class="tab" active-class="active">ЗАЯВКИ</RouterLink>
      <RouterLink to="/completed" class="tab" active-class="active">ВЫПОЛНЕНЫ</RouterLink>
      <RouterLink to="/stats" class="tab" active-class="active">СТАТИСТИКА</RouterLink>
    </nav>
  </aside>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'
const props = defineProps({ showUserButton: Boolean })

const username = localStorage.getItem('username') || 'admin'
const role = localStorage.getItem('role') || 'Администратор'
const router = useRouter()

function logout() {
  localStorage.removeItem('auth')
  localStorage.removeItem('username')
  localStorage.removeItem('role')
  router.push('/login')
}
</script>

<style scoped>
.sidebar {
  width: 220px;
  background: linear-gradient(135deg, #f8faff 0%, #e8f2ff 100%);
  color: #4a5568;
  display: flex;
  flex-direction: column;
  padding: 32px 0 32px 12px;
  min-height: 100vh;
  border-radius: 0 var(--border-radius) var(--border-radius) 0;
  margin: 0;
  box-shadow: 0 8px 32px rgba(116, 182, 255, 0.15);
  transition: all 0.3s ease;
  margin-top: 96px;
  position: relative;
  overflow: hidden;
  border-right: 1px solid rgba(116, 182, 255, 0.1);
}

.sidebar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.3) 100%);
  pointer-events: none;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  z-index: 2;
}

.tab {
  color: #4a5568;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%);
  text-decoration: none;
  padding: 14px 32px;
  border-radius: 18px 0 0 18px;
  font-size: 1.1rem;
  transition: all 0.3s ease;
  font-weight: 500;
  letter-spacing: 0.03em;
  border: 2px solid rgba(116, 182, 255, 0.2);
  box-shadow: 0 4px 16px rgba(116, 182, 255, 0.08);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.tab::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(116, 182, 255, 0.1), transparent);
  transition: left 0.5s ease;
}

.tab:hover::before {
  left: 100%;
}

.tab.active,
.tab.router-link-exact-active {
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
  color: #fff;
  font-weight: bold;
  border: 2px solid rgba(116, 182, 255, 0.6);
  box-shadow: 0 8px 32px rgba(116, 182, 255, 0.25);
  transform: translateX(5px);
}

.tab:not(.active):not(.router-link-exact-active):hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%);
  color: #0984e3;
  border: 2px solid rgba(116, 182, 255, 0.4);
  box-shadow: 0 6px 24px rgba(116, 182, 255, 0.15);
  transform: translateX(3px);
}

.mobile-profile-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
  border-radius: 22px;
  margin: 0 0 0 0;
  padding: 18px 10px 16px 10px;
  box-shadow: 0 8px 32px rgba(116, 182, 255, 0.12);
  border: 1.5px solid rgba(116, 182, 255, 0.2);
  backdrop-filter: blur(15px);
  position: relative;
  z-index: 2;
}

.profile-icon {
  margin-bottom: 8px;
}

.profile-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 2px;
  text-align: center;
  text-shadow: none;
}

.profile-role {
  font-size: 1rem;
  color: #74b9ff;
  margin-bottom: 10px;
  text-align: center;
  text-shadow: none;
}

.profile-logout {
  width: 100%;
  border-radius: 16px;
  padding: 10px 0;
  background: linear-gradient(135deg, #ff7675 0%, #e17055 100%);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 600;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(255, 118, 117, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 6px;
  position: relative;
  overflow: hidden;
}

.profile-logout::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.profile-logout:hover::before {
  left: 100%;
}

.profile-logout:hover {
  background: linear-gradient(135deg, #fd79a8 0%, #e84393 100%);
  border: 2px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 6px 24px rgba(255, 118, 117, 0.4);
  transform: translateY(-2px);
}

@media (max-width: 700px) {
  .sidebar {
    display: block !important;
    width: 100vw;
    min-width: 0;
    min-height: 0;
    height: auto;
    border-radius: 0;
    margin: 0;
    padding: 0 2px 0 2px;
    box-shadow: none;
    position: relative;
    left: 0;
    top: 0;
    background: linear-gradient(135deg, #f8faff 0%, #e8f2ff 100%);
  }
  .tab {
    display: block;
    border-radius: 24px !important;
    padding: 12px 0 !important;
    width: 100%;
    box-sizing: border-box;
    margin: 0 0 12px 0;
    min-width: 0;
    font-size: 1.05rem;
    text-align: center;
    font-weight: 600;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%);
  }
  .sidebar nav {
    display: block !important;
    width: 100%;
  }
  .mobile-profile-block {
    margin: 0;
    width: 100%;
    box-shadow: 0 8px 32px rgba(116, 182, 255, 0.15);
    margin-bottom: 18px;
    display: block !important;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
  }
}
</style>
