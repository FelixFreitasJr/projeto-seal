import { SUPABASE_URL, SUPABASE_KEY } from './config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// =========================
// LOGIN
// =========================
export async function login() {
  const user = document.getElementById("usuario").value.trim().toUpperCase()
  const pass = document.getElementById("senha").value.trim().toUpperCase()

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('usuario', user)

  if (error || !data || data.length === 0) {
    showToast("Usuário ou senha inválidos", "erro")
    return false
  }

  const userData = data[0]

  if (pass !== userData.senha) {
    showToast("Usuário ou senha inválidos", "erro")
    return false
  }

  // salva usuário + timestamp da sessão
  userData.loginTime = Date.now()
  localStorage.setItem("usuarioLogado", JSON.stringify(userData))

  window.location.href = "../index.html"
  return true
}

// =========================
// LOGOUT
// =========================
export function logout() {
  localStorage.removeItem("usuarioLogado")
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
  const user = JSON.parse(localStorage.getItem("usuarioLogado"))

  if (!user) {
    redirecionarLogin()
    return
  }

  // verifica se já passou 1 hora (3600000 ms)
  const agora = Date.now()
  if (agora - user.loginTime > 3600000) {
    showToast("Sessão expirada. Faça login novamente.", "alerta")
    logout()
    return
  }

  aplicarPermissoes(user)
}

export function getUser() {
  const user = JSON.parse(localStorage.getItem("usuarioLogado"))
  return user ? user.usuario : null
}

// =========================
// PERMISSÕES
// =========================
function aplicarPermissoes(user) {
  const perfil = user.perfil
  let edicao = user.edicao

  if (!Array.isArray(edicao)) {
    if (typeof edicao === "string") {
      edicao = edicao.split(",")
    } else {
      edicao = []
    }
  }

  if (perfil !== "ADM") {
    document.getElementById("btnConfig")?.classList.add("hidden")
    document.getElementById("btnPedidos")?.classList.add("hidden")
    document.getElementById("btnExportarLista")?.classList.add("hidden")
    document.getElementById("btnExportarHistorico")?.classList.add("hidden")
    document.getElementById("btnPDF")?.classList.add("hidden")
  }

  if (!edicao.includes("estoque")) {
    document.querySelectorAll(".acoes").forEach(el => el.classList.add("hidden"))
  }

  if (!edicao.includes("excluirColaborador")) {
    document.querySelectorAll(".btnExcluirColaborador").forEach(el => el.classList.add("hidden"))
  }

  document.querySelector(".menu-toggle")?.addEventListener("click", () => {
    const menu = document.querySelector(".menu-suspenso")
    menu.style.display = menu.style.display === "flex" ? "none" : "flex"
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
