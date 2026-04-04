async function login() {
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

  // salva apenas um token de sessão temporário
  sessionStorage.setItem("user", data.usuario)
  window.location.href = "../index.html"
}

function logout() {
  sessionStorage.removeItem("user")
  if (window.location.pathname.includes('/pages/')) {
    window.location.href = 'login.html'
  } else {
    window.location.href = 'pages/login.html'
  }
}

function checkAuth() {
  const user = sessionStorage.getItem("user")
  if (!user) {
    if (window.location.pathname.includes('/pages/')) {
      window.location.href = 'login.html'
    } else {
      window.location.href = 'pages/login.html'
    }
  }
}

function getUser() {
  return sessionStorage.getItem("user")
}
