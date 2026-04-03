function login() {
  const usuario = document.getElementById("usuario").value
  const senha = document.getElementById("senha").value

  if (
    (usuario === "externo" ||
     usuario === "satelite" ||
     usuario === "adm") &&
    senha === "Almox"
  ) {
    localStorage.setItem("user", usuario)

    // REDIRECIONA CORRETO
    window.location.href = "../index.html"
  } else {
    alert("Usuário ou senha inválidos")
  }
}

function logout() {
  localStorage.removeItem("user")

  // REDIRECIONA CORRETO
  window.location.href = "pages/login.html"
}

function checkAuth() {
  const user = localStorage.getItem("user")

  // se NÃO estiver logado
  if (!user) {
    // 🔴 AQUI ESTAVA O ERRO
    window.location.href = "pages/login.html"
  }
}

function getUser() {
  return localStorage.getItem("user")
}