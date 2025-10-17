<script setup>
import Sidebar from './components/Sidebar.vue'
import UserButton from './components/UserButton.vue'
import { RouterView, useRoute } from 'vue-router'
import { ref, computed, onMounted, onUnmounted } from 'vue'

const route = useRoute()
const isAuth = ref(localStorage.getItem('auth') === '1')
const isLogin = computed(() => route.name === 'login')

function updateAuth() {
  isAuth.value = localStorage.getItem('auth') === '1'
}

onMounted(() => {
  window.addEventListener('storage', updateAuth)
})
onUnmounted(() => {
  window.removeEventListener('storage', updateAuth)
})

// Для мобильного drawer-меню
const showSidebar = ref(false)
function openSidebar() {
  showSidebar.value = true
}
function closeSidebar() {
  showSidebar.value = false
}

const isMobile = computed(() => window.innerWidth <= 700)
</script>

<template>
  <header class="main-header">
    <div class="header-left">
      <button class="burger" @click="openSidebar" v-if="isAuth && !isLogin">
        <span></span><span></span><span></span>
      </button>
    </div>
    <div class="header-title">КУРСКИЕ ПРОСТОРЫ</div>
    <div class="header-user" v-if="isAuth && !isLogin && !isMobile">
      <UserButton />
    </div>
  </header>
  <div v-if="isAuth || isLogin" class="app-layout">
    <!-- Desktop Sidebar -->
    <Sidebar v-if="!isLogin && !isMobile" class="sidebar-desktop" />
    <!-- Mobile Sidebar Drawer -->
    <transition name="sidebar-slide">
      <div
        v-if="showSidebar && !isLogin && isMobile"
        class="sidebar-drawer-overlay"
        @click.self="closeSidebar"
      >
        <button class="sidebar-close" @click="closeSidebar">
          <svg width="32" height="32" viewBox="0 0 24 24">
            <line
              x1="6"
              y1="6"
              x2="18"
              y2="18"
              stroke="#fff"
              stroke-width="2.5"
              stroke-linecap="round"
            />
            <line
              x1="18"
              y1="6"
              x2="6"
              y2="18"
              stroke="#fff"
              stroke-width="2.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <Sidebar class="sidebar-drawer" :showUserButton="true" @click.stop />
      </div>
    </transition>
    <main v-if="!isLogin" class="main-content">
      <RouterView />
    </main>
    <RouterView v-if="isLogin" />
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700&family=Oswald:wght@700&display=swap');
:global(html, body) {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  width: 100dvw;
  height: 100dvh;
  background: var(--bg-main);
}
:global(#app) {
  margin: 0;
  padding: 0;
  min-height: 100dvh;
  min-width: 100dvw;
  box-sizing: border-box;
}
:root {
  --bg-main: #f3f6fa;
  --bg-sidebar: #e9eef5;
  --bg-content: #fff;
  --text-main: #232b36;
  --accent: #3b82f6;
  --border-radius: 18px;
  --shadow: 0 4px 24px 0 rgba(0, 0, 0, 0.08);
}
.main-header {
  width: 100vw;
  height: 72px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
}
.header-left {
  display: flex;
  align-items: center;
  height: 100%;
}
.header-title {
  color: var(--accent);
  font-family: 'Oswald', Arial, sans-serif;
  font-size: 2.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-align: center;
  line-height: 72px;
  pointer-events: none;
  user-select: none;
  text-shadow: 0 2px 16px rgba(59, 130, 246, 0.15);
  text-transform: uppercase;
  flex: 1;
}
.header-user {
  min-width: 80px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  margin-right: 32px;
}
.app-layout {
  display: flex;
  height: 100vh;
  background: var(--bg-main);
  margin: 0;
  padding: 0;
  width: 100vw;
  box-sizing: border-box;
}
.sidebar {
  width: 220px;
  background: var(--bg-sidebar);
  color: var(--text-main);
  display: flex;
  flex-direction: column;
  padding: 32px 0;
  min-height: 100vh;
  border-radius: 0 var(--border-radius) var(--border-radius) 0;
  margin: 0;
  box-shadow: var(--shadow);
  transition: background 0.3s;
  margin-top: 96px;
  margin-left: 24px;
}
.main-content {
  flex: 1;
  padding: 32px;
  background: var(--bg-content);
  color: var(--text-main);
  border-radius: var(--border-radius);
  margin: 24px 0 24px 0;
  box-shadow: var(--shadow);
  overflow-y: auto;
  min-width: 0;
  transition: background 0.3s;
  margin-top: 96px;
  position: relative;
  width: 100%;
  box-sizing: border-box;
}
.burger {
  display: none;
  background: rgba(24, 28, 35, 0.85);
  border: 2px solid #fff;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 44px;
  height: 44px;
  margin-left: 8px;
  margin-right: 8px;
  z-index: 300;
  cursor: pointer;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.18);
}
.burger span {
  display: block;
  width: 28px;
  height: 4px;
  margin: 3px 0;
  background: #fff;
  border-radius: 2px;
  transition: 0.2s;
}
.burger:active,
.burger:focus {
  outline: 2px solid var(--accent);
  border-color: var(--accent);
}
.sidebar-close {
  position: absolute;
  top: 14px;
  right: 16px;
  background: rgba(24, 28, 35, 0.85);
  border: 2px solid #fff;
  border-radius: 50%;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: pointer;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.18);
  transition:
    background 0.2s,
    border 0.2s;
}
.sidebar-close:hover {
  background: #e74c3c;
  border: 2px solid #c0c0c0;
}
@media (max-width: 700px) {
  .main-header {
    height: 54px;
    min-height: 54px;
    padding: 0 8px;
  }
  .header-title {
    font-size: 1.1rem;
    line-height: 54px;
    letter-spacing: 0.08em;
  }
  .header-user {
    min-width: 48px;
    margin-right: 8px;
  }
  .user-btn {
    width: 36px !important;
    height: 36px !important;
    margin: 0 !important;
  }
  .burger {
    display: flex !important;
  }
  .app-layout {
    flex-direction: column;
    margin: 0;
    padding: 0;
  }
  .sidebar {
    flex-direction: row;
    width: 100vw;
    min-width: 0;
    min-height: 0;
    height: 54px;
    border-radius: 0;
    margin: 0;
    padding: 0 2px 0 2px;
    box-shadow: none;
    position: fixed;
    left: 0;
    bottom: 0;
    z-index: 101;
    background: var(--bg-sidebar);
    align-items: center;
    justify-content: space-around;
  }
  .sidebar nav {
    flex-direction: row;
    gap: 4px;
    width: 100%;
    justify-content: space-around;
  }
  .tab {
    border-radius: 12px;
    padding: 8px 10px;
    font-size: 0.95rem;
    min-width: 80px;
    text-align: center;
    box-shadow: none;
  }
  .main-content {
    margin: 60px 0 60px 0;
    padding: 10px 2vw;
    border-radius: 0;
    min-width: 0;
    box-shadow: none;
  }
  .sidebar-desktop {
    display: none !important;
  }
  .sidebar-drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    z-index: 200;
    display: flex;
    align-items: stretch;
  }
  .sidebar-drawer {
    min-width: 100vw;
    max-width: 100vw;
    height: 100vh;
    background: var(--bg-sidebar);
    box-shadow: none;
    border-radius: 0;
    animation: sidebarIn 0.22s cubic-bezier(0.4, 1.3, 0.6, 1) both;
    position: relative;
    z-index: 201;
    left: 0;
    padding-top: 24px;
  }
  @keyframes sidebarIn {
    from {
      transform: translateX(-100%);
      opacity: 0.5;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
}
@media (min-width: 701px) {
  .sidebar-drawer-overlay,
  .sidebar-drawer,
  .burger {
    display: none !important;
  }
  .sidebar-desktop {
    display: block !important;
  }
  .header-left {
    min-width: 0;
  }
  .sidebar-close {
    display: none !important;
  }
}
</style>
