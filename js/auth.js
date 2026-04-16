import { SUPABASE_URL, SUPABASE_KEY } from './config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function safeShowToast(msg, tipo = 'sucesso') {
  if (typeof window.showToast === 'function') {
    window.showToast(msg, tipo)
    return
  }

  const toast = document.createElement('div')
  toast.className = `toast ${tipo}`
  toast.innerText = msg
  document.body.appendChild(toast)

  setTimeout(() => toast.classList.add('show'), 10)
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

// =========================
// LOGIN
// =========================
export async function login() {
  const userInput = document.getElementById('usuario')
  const passInput = document.getElementById('senha')

  if (!userInput || !passInput) {
    safeShowToast('Campos de login não encontrados na página.', 'erro')
    return false
  }

  const user = userInput.value.trim().toUpperCase()
  const pass = passInput.value.trim()

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('usuario', user)

  if (error || !data || data.length === 0) {
    safeShowToast('Usuário ou senha inválidos', 'erro')
    return false
  }

  const userData = data[0]
  const senhaBanco = String(userData.senha ?? '').trim()

  if (pass.toUpperCase() !== senhaBanco.toUpperCase()) {
    safeShowToast('Usuário ou senha inválidos', 'erro')
    return false
  }

  userData.loginTime = Date.now()
  localStorage.setItem('usuarioLogado', JSON.stringify(userData))

  window.location.href = '../index.html'
  return true
}

function initLoginForm() {
  const form = document.getElementById('formLogin')
  if (!form) return

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    await login()
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoginForm)
} else {
  initLoginForm()
}

// =========================
// LOGOUT
// =========================
export function logout() {
  localStorage.removeItem('usuarioLogado')
  if (window.location.pathname.includes('/pages/')) {
    window.location.href = 'login.html'
  } else {
    window.location.href = 'pages/login.html'
  }
}

// =========================
// CHECK AUTH
// =========================
export function checkAuth() {
  const user = JSON.parse(localStorage.getItem('usuarioLogado'))

  if (!user) {
    redirecionarLogin()
    return
  }

  const agora = Date.now()
  if (agora - user.loginTime > 3600000) {
    safeShowToast('Sessão expirada. Faça login novamente.', 'alerta')
    logout()
    return
  }

  aplicarPermissoes(user)
}

export function getUser() {
  const user = JSON.parse(localStorage.getItem('usuarioLogado'))
  return user ? user.usuario : null
}

// =========================
// PERMISSÕES
// =========================
function aplicarPermissoes(user) {
  const perfil = user.perfil
  let edicao = user.edicao

  if (!Array.isArray(edicao)) {
    if (typeof edicao === 'string') {
      edicao = edicao.split(',')
    } else {
      edicao = []
    }
  }

  if (perfil !== 'ADM') {
    document.getElementById('btnConfig')?.classList.add('hidden')
    document.getElementById('btnPedidos')?.classList.add('hidden')
    document.getElementById('btnExportarLista')?.classList.add('hidden')
    document.getElementById('btnExportarHistorico')?.classList.add('hidden')
    document.getElementById('btnPDF')?.classList.add('hidden')
  }

  if (!edicao.includes('estoque')) {
    document.querySelectorAll('.acoes').forEach((el) => el.classList.add('hidden'))
  }

  if (!edicao.includes('excluirColaborador')) {
    document.querySelectorAll('.btnExcluirColaborador').forEach((el) => el.classList.add('hidden'))
  }

  document.querySelector('.menu-toggle')?.addEventListener('click', () => {
    const menu = document.querySelector('.menu-suspenso')
    if (!menu) return
    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex'
  })
}

// =========================
// REDIRECIONAR LOGIN
// =========================
function redirecionarLogin() {
  if (window.location.pathname.includes('/pages/')) {
    window.location.href = 'login.html'
  } else {
    window.location.href = 'pages/login.html'
  }
}

// =========================
// FUNÇÕES GLOBAIS
// =========================
window.logout = logout
