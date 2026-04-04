function login() {
  const usuario = document.getElementById("usuario").value
  const senha = document.getElementById("senha").value

  if (
    (usuario === "EXTERNO" ||
     usuario === "SATELITE" ||
     usuario === "ADM") &&
    senha === "ALMOX"
  ) {
    localStorage.setItem("user", usuario)
    // Se login.html está dentro de /pages/, volta para raiz
    window.location.href = "../index.html"
  } else {
    alert("Usuário ou senha inválidos")
  }
}

function logout() {
  localStorage.removeItem("user")
  if (window.location.pathname.includes('/pages/')) {
    window.location.href = 'login.html'
  } else {
    window.location.href = 'pages/login.html'
  }
}

function checkAuth() {
  const user = localStorage.getItem("user")
  if (!user) {
    if (window.location.pathname.includes('/pages/')) {
      window.location.href = 'login.html'
    } else {
      window.location.href = 'pages/login.html'
    }
  }
}

function getUser() {
  return localStorage.getItem("user")
}
