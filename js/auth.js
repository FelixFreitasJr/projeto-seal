import { SUPABASE_URL, SUPABASE_KEY } from './config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function login() {
  const usuario = document.getElementById("usuario").value.trim().toUpperCase()
  const senha = document.getElementById("senha").value.trim().toUpperCase()

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('usuario', usuario) // ✅ CORRETO

  if (error || !data || data.length === 0) {
    alert("Usuário ou senha inválidos")
    return
  }

  // pega o primeiro registro (mantém compatibilidade)
  const userData = data[0]

  if (senha !== userData.senha) {
    alert("Usuário ou senha inválidos")
    return
  }

  localStorage.setItem("usuarioLogado", JSON.stringify(userData))
  window.location.href = "../index.html"
}

export function logout() {
  localStorage.removeItem("usuarioLogado")
  if (window.location.pathname.includes('/pages/')) {
    window.location.href = 'login.html'
  } else {
    window.location.href = 'pages/login.html'
  }
}

export function checkAuth() {
  const user = JSON.parse(localStorage.getItem("usuarioLogado"))

  if (!user) {
    if (window.location.pathname.includes('/pages/')) {
      window.location.href = 'login.html'
    } else {
      window.location.href = 'pages/login.html'
    }
  } else {
    aplicarPermissoes(user)
  }
}

export function getUser() {
  const user = JSON.parse(localStorage.getItem("usuarioLogado"))
  return user ? user.usuario : null
}

// 🔧 CORREÇÃO DE PERMISSÕES
function aplicarPermissoes(user) {
  const perfil = user.perfil

  // 🔥 força edicao ser array SEM quebrar sistema
  let edicao = user.edicao

  if (!Array.isArray(edicao)) {
    if (typeof edicao === "string") {
      edicao = edicao.split(",")
    } else {
      edicao = []
    }
  }

  // Configurações e pedidos só para ADM
  if (perfil !== "ADM") {
    document.getElementById("btnConfig")?.classList.add("hidden")
    document.getElementById("btnPedidos")?.classList.add("hidden")
  }

  // Exportar PDF/histórico só para ADM
  if (perfil !== "ADM") {
    document.getElementById("btnExportarLista")?.classList.add("hidden")
    document.getElementById("btnExportarHistorico")?.classList.add("hidden")
    document.getElementById("btnPDF")?.classList.add("hidden")
  }

  // Estoque
  if (!edicao.includes("estoque")) {
    document.querySelectorAll(".acoes").forEach(el => el.classList.add("hidden"))
  }

  // Dispensa
  if (!edicao.includes("excluirColaborador")) {
    document.querySelectorAll(".btnExcluirColaborador").forEach(el => el.classList.add("hidden"))
  }

  // Menu mobile
  document.querySelector(".menu-toggle")?.addEventListener("click", () => {
    const menu = document.querySelector(".menu-suspenso")
    menu.style.display = menu.style.display === "flex" ? "none" : "flex"
  })
}

window.login = login
window.logout = logout