import { SUPABASE_URL, SUPABASE_KEY } from './config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const SESSION_KEY = 'usuarioLogado'
const LOGIN_GUARD_KEY = 'seal_login_guard'
const MAX_TENTATIVAS = 5
const BLOQUEIO_MS = 5 * 60 * 1000

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
  const pass = passInput.value.trim().toUpperCase()

  if (isLoginBloqueado(user)) {
    safeShowToast('Muitas tentativas. Aguarde 5 minutos para tentar novamente.', 'alerta')
    return false
  }

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('usuario', user)

  if (error || !data || data.length === 0) {
    registrarFalhaLogin(user)
    safeShowToast('Usuário ou senha inválidos', 'erro')
    return false
  }

  const userData = data[0]
  const senhaBanco = String(userData.senha ?? '').trim()
  const senhaValida = await conferirSenha(pass, senhaBanco)

  if (!senhaValida) {
    registrarFalhaLogin(user)
    safeShowToast('Usuário ou senha inválidos', 'erro')
    return false
  }

  limparFalhasLogin(user)

  const sessao = {
    id: gerarIdSessao(),
    loginTime: Date.now(),
    usuario: userData.usuario,
    perfil: userData.perfil,
    edicao: userData.edicao
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(sessao))

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
  localStorage.removeItem(SESSION_KEY)
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
  const user = JSON.parse(localStorage.getItem(SESSION_KEY))

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
  const user = JSON.parse(localStorage.getItem(SESSION_KEY))
  return user ? user.usuario : null
}

async function conferirSenha(senhaDigitada, senhaBanco) {
  if (!senhaDigitada || !senhaBanco) return false

  const hashPareceBcrypt = /^\$2[aby]\$\d{2}\$.{53}$/.test(senhaBanco)
  if (hashPareceBcrypt && typeof window.bcrypt?.compareSync === 'function') {
    return window.bcrypt.compareSync(senhaDigitada, senhaBanco)
  }

  return senhaDigitada.trim() === senhaBanco.trim()
}

function gerarIdSessao() {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function lerGuardaLogin() {
  const bruto = localStorage.getItem(LOGIN_GUARD_KEY)
  if (!bruto) return {}

  try {
    return JSON.parse(bruto)
  } catch {
    return {}
  }
}

function salvarGuardaLogin(state) {
  localStorage.setItem(LOGIN_GUARD_KEY, JSON.stringify(state))
}

function registrarFalhaLogin(usuario) {
  const agora = Date.now()
  const state = lerGuardaLogin()
  const atual = state[usuario] || { tentativas: 0, bloqueadoAte: 0 }

  if (atual.bloqueadoAte && agora < atual.bloqueadoAte) {
    return
  }

  atual.tentativas += 1
  if (atual.tentativas >= MAX_TENTATIVAS) {
    atual.bloqueadoAte = agora + BLOQUEIO_MS
    atual.tentativas = 0
  }

  state[usuario] = atual
  salvarGuardaLogin(state)
}

function limparFalhasLogin(usuario) {
  const state = lerGuardaLogin()
  if (!state[usuario]) return
  delete state[usuario]
  salvarGuardaLogin(state)
}

function isLoginBloqueado(usuario) {
  const agora = Date.now()
  const state = lerGuardaLogin()
  const atual = state[usuario]
  if (!atual?.bloqueadoAte) return false

  if (agora >= atual.bloqueadoAte) {
    delete state[usuario]
    salvarGuardaLogin(state)
    return false
  }

  return true
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
