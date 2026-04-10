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

  const user = getUser()
  const titulo = document.querySelector(".titulo small")
  if (titulo && user) {
    titulo.innerText += " | Usuário: " + user
  }

  if (user === "ADM") {
    document.getElementById("btnPedidos")?.classList.remove("hidden")
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

  if (window.location.pathname.includes("pedidos.html")) {
  if (getUser() !== "ADM") {
    alert("Acesso restrito")
    window.location.href = "../index.html"
  }
}

  // =========================
// LOAD DASHBOARD
// =========================
if (
  window.location.pathname.endsWith("/") ||
  window.location.pathname.endsWith("index.html")
) {
  carregarDashboard()
  carregarGraficos()
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
// MENU AÇÕES
// =========================
window.toggleMenu = (btn) => {
  const menu = btn.nextElementSibling
  menu.classList.toggle("hidden")
}

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

// =========================
// MODAL DISPENSADOS
// =========================
window.abrirModalDispensados = async function () {
  document.getElementById("modalDispensados").classList.remove("hidden")

  const { data, error } = await supabase
    .from('dispensas')
    .select('*')

  if (error) return

  const mapa = {}

  data.forEach(item => {
    if (!mapa[item.cpf]) {
      mapa[item.cpf] = {
        cpf: item.cpf,
        nome: item.nome,
        empresa: item.empresa,
        local: item.usuario,
        quantidade: 0
      }
    }

    mapa[item.cpf].quantidade += 1
  })

  const tbody = document.getElementById("listaDispensados")
  tbody.innerHTML = ''

  Object.values(mapa)
    .sort((a, b) => b.quantidade - a.quantidade)
    .forEach(p => {
      

    const tr = document.createElement("tr")
      if (p.quantidade > 15) {
              tr.style.background = "#ffe0e0"
              tr.style.fontWeight = "bold"
            }
    tr.innerHTML = `
      <td>${mascararCPF(p.cpf)}</td>
      <td>${p.nome}</td>
      <td>${p.empresa}</td>
      <td>${p.local}</td>
      <td>${p.quantidade}</td>
    `

    tr.style.cursor = "pointer"
    tr.onclick = () => carregarHistorico(p.cpf)

    tbody.appendChild(tr)
  })
}

window.fecharModalDispensados = function () {
  document.getElementById("modalDispensados").classList.add("hidden")
}

async function carregarHistorico(cpf) {
  const { data } = await supabase
    .from('dispensas')
    .select('*')
    .eq('cpf', cpf)
    .order('data_hora', { ascending: false })

  const tbody = document.getElementById("historicoDispensa")
  tbody.innerHTML = ''

  data.forEach(item => {
    const tr = document.createElement("tr")

    tr.innerHTML = `
      <td>${new Date(item.data_hora).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo'
      })}</td>
    `

    tbody.appendChild(tr)
  })
}

function mascararCPF(cpf) {
  cpf = cpf.replace(/[^\d]/g, '')

  if (cpf.length !== 11) return cpf

  return cpf.substring(0, 3) + '.' +
         cpf.substring(3, 6) + '.XXX-' +
         cpf.substring(9, 11)
}

// =========================
// GRÁFICOS
// =========================
let graficoPizza = null
let graficoBarra = null

function destruirGraficos() {
  if (graficoPizza) {
    graficoPizza.destroy()
    graficoPizza = null
  }

  if (graficoBarra) {
    graficoBarra.destroy()
    graficoBarra = null
  }
}

async function carregarGraficos() {

  destruirGraficos()

  const inicio = document.getElementById("dataInicio")?.value
  const fim = document.getElementById("dataFim")?.value

  let query = supabase.from('dispensas').select('*')

  if (inicio) query = query.gte('data_hora', inicio)
  if (fim) query = query.lte('data_hora', fim)

  const { data, error } = await query

  if (error || !data) return

  // 📊 PIZZA (LOCAL)
  const mapaLocal = {
    ADM: 0,
    EXTERNO: 0,
    SATELITE: 0
  }

  data.forEach(d => {
    if (mapaLocal[d.usuario] !== undefined) {
      mapaLocal[d.usuario]++
    }
  })

  graficoPizza = new Chart(document.getElementById("graficoPizza"), {
    type: 'pie',
    data: {
      labels: Object.keys(mapaLocal),
      datasets: [{
        data: Object.values(mapaLocal),
        backgroundColor: [
        '#4CAF50', // verde (ADM)
        '#2196F3', // azul (EXTERNO)
        '#FF9800'  // laranja (SATELITE)
      ]
      }]
    }
  })

  // 📊 BARRA (MÊS A MÊS)
  const mapaMes = {}

  data.forEach(d => {
    const dataObj = new Date(
      new Date(d.data_hora).toLocaleString('en-US', {
        timeZone:'America/Sao_Paulo'
      })
    )
    const chave = `${dataObj.getFullYear()}-${dataObj.getMonth()}`

    if (!mapaMes[chave]) {
      mapaMes[chave] = {
        label: dataObj.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }),
        total: 0
      }
    }

    mapaMes[chave].total++
  })

  const mesesOrdenados = Object.entries(mapaMes)
    .sort((a, b) => {
      const [anoA, mesA] = a[0].split('-').map(Number)
      const [anoB, mesB] = b[0].split('-').map(Number)
      return new Date(anoA, mesA) - new Date(anoB, mesB)
    })
    .map(item => item[1])

  graficoBarra = new Chart(document.getElementById("graficoBarra"), {
    type: 'bar',
    data: {
      labels: mesesOrdenados.map(m => m.label),
      datasets: [{
        label: 'Dispensas por mês',
        data: mesesOrdenados.map(m => m.total),
        backgroundColor: '#2196F3'
      }]
    }
  })
}

window.filtrarPeriodo = function(dias) {
  const hoje = new Date()
  const inicio = new Date()

  inicio.setDate(hoje.getDate() - dias)

  document.getElementById("dataInicio").value = inicio.toISOString().split('T')[0]
  document.getElementById("dataFim").value = hoje.toISOString().split('T')[0]

  carregarGraficos()
}

window.toggleFiltroPersonalizado = function() {
  document.getElementById("filtroCustom").classList.toggle("hidden")
}

window.exportarListaPDF = async function () {
  const elemento = document.getElementById("listaDispensados")

  const canvas = await html2canvas(elemento)
  const imgData = canvas.toDataURL("image/png")

  const pdf = new jspdf.jsPDF('p', 'mm', 'a4')
  const largura = 190
  const altura = (canvas.height * largura) / canvas.width

  pdf.addImage(imgData, 'PNG', 10, 10, largura, altura)
  pdf.save("lista_dispensados.pdf")
}

window.exportarHistoricoPDF = async function () {
  const elemento = document.getElementById("historicoDispensa")

  const canvas = await html2canvas(elemento)
  const imgData = canvas.toDataURL("image/png")

  const pdf = new jspdf.jsPDF('p', 'mm', 'a4')
  const largura = 190
  const altura = (canvas.height * largura) / canvas.width

  pdf.addImage(imgData, 'PNG', 10, 10, largura, altura)
  pdf.save("historico.pdf")
}