import { SUPABASE_URL, SUPABASE_KEY } from './config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import bcrypt from 'https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function login() {
  const usuario = document.getElementById("usuario").value.trim().toUpperCase()
  const senha = document.getElementById("senha").value

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('usuario', usuario)
    .single()

  if (error || !data) {
    alert("Usuário ou senha inválidos")
    return
  }

  // compara senha com hash
  const senhaValida = bcrypt.compareSync(senha, data.senha)

  if (!senhaValida) {
    alert("Usuário ou senha inválidos")
    return
  }

  localStorage.setItem("usuarioLogado", JSON.stringify(data))
  window.location.href = "../index.html"
}

export function logout() {
  // Remove usuário do localStorage
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
  }
}

export function getUser() {
  return JSON.parse(localStorage.getItem("usuarioLogado"))
}

// expõe logout para ser usado nos botões
window.logout = logout
