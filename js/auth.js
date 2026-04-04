import { SUPABASE_URL, SUPABASE_KEY } from './config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function login() {
  const usuario = document.getElementById("usuario").value
  const senha = document.getElementById("senha").value

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('usuario', usuario)
    .eq('senha', senha)
    .single()

  if (error || !data) {
    alert("Usuário ou senha inválidos")
    return
  }

  // salva apenas em sessionStorage (expira ao fechar navegador)
  sessionStorage.setItem("user", data.usuario)
  window.location.href = "../index.html"
}

export function logout() {
  sessionStorage.removeItem("user")
  if (window.location.pathname.includes('/pages/')) {
    window.location.href = 'login.html'
  } else {
    window.location.href = 'pages/login.html'
  }
}

export function checkAuth() {
  const user = sessionStorage.getItem("user")
  if (!user) {
    if (window.location.pathname.includes('/pages/')) {
      window.location.href = 'login.html'
    } else {
      window.location.href = 'pages/login.html'
    }
  }
}

export function getUser() {
  return sessionStorage.getItem("user")
}
