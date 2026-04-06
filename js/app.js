import { initEstoque } from './modules/estoque.js'
import { initDispensa } from './modules/dispensa.js'
import { SUPABASE_URL, SUPABASE_KEY } from './config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { getUser } from './auth.js'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// =========================
// INIT
// =========================
document.addEventListener('DOMContentLoaded', () => {
  const pagina = window.location.href

  if (pagina.endsWith("estoque.html")) {
    initEstoque()
  }

  if (pagina.endsWith("dispensa.html")) {
    initDispensa()
  }

  // Usuário no título
  const user = getUser()
  const titulo = document.querySelector(".titulo small")
  if (titulo && user) {
    titulo.innerText += " | Usuário: " + user
  }

  // Config ADM
  if (user === "ADM") {
    const btn = document.getElementById("btnConfig")
    if (btn) btn.classList.remove("hidden")

    btn?.addEventListener("click", async () => {
      const { data, error } = await supabase.from('usuarios').select('*')
      if (error) return alert("Erro ao carregar usuários")

      let linhas = ''
      data.forEach(u => {
        linhas += `
          <tr>
            <td>${u.usuario}</td>
            <td>${u.perfil}</td>
            <td>
              <button onclick="alterarSenha('${u.usuario}')">Alterar Senha</button>
            </td>
          </tr>`
      })

      document.getElementById("tabelaUsuarios").innerHTML = linhas
      document.getElementById("modalConfig").classList.remove("hidden")
    })

    document.getElementById("btnFecharConfig")?.addEventListener("click", () => {
      document.getElementById("modalConfig").classList.add("hidden")
    })
  }
})

// =========================
// NAVEGAÇÃO
// =========================
window.ir = function(pagina) {
  if (window.location.pathname.includes('/pages/')) {
    window.location.href = pagina
  } else {
    window.location.href = 'pages/' + pagina
  }
}

// =========================
// MENU AÇÕES (⋮)
// =========================
window.toggleMenu = (btn) => {
  const menu = btn.nextElementSibling
  menu.classList.toggle("hidden")
}

// Fecha menus ao clicar fora
document.addEventListener('click', (event) => {
  const menus = document.querySelectorAll('.menu-acoes')
  menus.forEach(menu => {
    if (!menu.contains(event.target) && !menu.previousElementSibling.contains(event.target)) {
      menu.classList.add('hidden')
    }
  })
})

// =========================
// ALTERAR SENHA
// =========================
window.alterarSenha = async (usuario) => {
  const novaSenha = prompt("Digite a nova senha para " + usuario)
  if (!novaSenha) return

  const { error } = await supabase
    .from('usuarios')
    .update({ senha: novaSenha })
    .eq('usuario', usuario)

  if (error) {
    showToast("Erro ao alterar senha")
  } else {
    showToast("Senha atualizada com sucesso")
  }
}

// =========================
// DASHBOARD
// =========================
async function carregarDashboard() {
  const { count: produtos } = await supabase
    .from('produtos')
    .select('*', { count: 'exact', head: true })

  const { count: colaboradores } = await supabase
    .from('colaboradores')
    .select('*', { count: 'exact', head: true })

  const { count: dispensas } = await supabase
    .from('dispensas')
    .select('*', { count: 'exact', head: true })

  document.getElementById("totalProdutos").innerText = produtos || 0
  document.getElementById("totalColaboradores").innerText = colaboradores || 0
  document.getElementById("totalDispensas").innerText = dispensas || 0
}

if (
  window.location.pathname.endsWith("/") ||
  window.location.pathname.endsWith("index.html")
) {
  carregarDashboard()
}

// =========================
// TOAST
// =========================
window.showToast = function(msg) {
  const toast = document.createElement("div")
  toast.className = "toast"
  toast.innerText = msg
  document.body.appendChild(toast)

  setTimeout(() => toast.classList.add("show"), 10)

  setTimeout(() => {
    toast.classList.remove("show")
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

// app.js

function setFavicon(svgPath) {
  // Remove favicon antigo se existir
  const oldFavicon = document.querySelector("link[rel='icon']");
  if (oldFavicon) oldFavicon.remove();

  // Cria novo favicon
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = svgPath;

  document.head.appendChild(link);
}

// Usa a função passando o caminho do seu SVG
setFavicon("img/favicon.svg");