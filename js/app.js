import { initEstoque } from './modules/estoque.js'
import { initDispensa } from './modules/dispensa.js'
import { SUPABASE_URL, SUPABASE_KEY } from './config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { getUser } from './auth.js'
import { carregarGraficos, filtrarPeriodo, toggleFiltroPersonalizado } from './modules/graficos.js'
import { habilitarResizeTabelas } from './modules/column-resizer.js'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
let colaboradoresDispensados = {}

// =========================
// INIT
// =========================
function inicializarApp() {
  const pathname = window.location.pathname.toLowerCase()

  if (pathname.endsWith('/estoque.html')) initEstoque()
  if (pathname.endsWith('/dispensa.html')) initDispensa()

  const user = getUser()
  const sessao = JSON.parse(localStorage.getItem('usuarioLogado') || '{}')
  const perfil = sessao?.perfil
  const titulo = document.querySelector('.titulo small')
  if (titulo && user) titulo.innerText += ' | Usuário: ' + user

  if (perfil === 'ADM') {
    document.getElementById('btnPedidos')?.classList.remove('hidden')
    const btn = document.getElementById('btnConfig')
    if (btn) btn.classList.remove('hidden')

    btn?.addEventListener('click', async () => {
      const { data, error } = await supabase.from('usuarios').select('*')
      if (error) return showToast('Erro ao carregar usuários', 'erro')

      let linhas = ''
      data.forEach(u => {
        linhas += `
          <tr>
            <td>${u.usuario}</td>
            <td>${u.perfil}</td>
            <td><button onclick="alterarSenha('${u.usuario}')">Alterar Senha</button></td>
          </tr>`
      })

      document.getElementById('tabelaUsuarios').innerHTML = linhas
      document.getElementById('modalConfig').classList.remove('hidden')
    })

    document.getElementById('btnFecharConfig')?.addEventListener('click', () => {
      document.getElementById('modalConfig').classList.add('hidden')
    })
  }

  if (window.location.pathname.includes('pedidos.html')) {
    if (perfil !== 'ADM') {
      alert('Acesso restrito')
      window.location.href = '../index.html'
    }
  }

  if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
    if (document.getElementById('totalProdutos')) carregarDashboard()
    if (document.getElementById('graficoPizza')) carregarGraficos()
  }

  initMenuResponsivo()
  habilitarResizeTabelas()
}


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarApp)
} else {
  inicializarApp()
}

function initMenuResponsivo() {
  const menuPrincipal = document.querySelector('.menu-principal')
  const botaoToggle = document.querySelector('.menu-toggle')
  const topoDireita = document.querySelector('.topo-direita')
  if (!menuPrincipal || !botaoToggle || !topoDireita) return

  let menuSuspenso = document.querySelector('.menu-suspenso')
  if (!menuSuspenso) {
    menuSuspenso = menuPrincipal.cloneNode(true)
    menuSuspenso.classList.remove('menu-principal')
    menuSuspenso.classList.add('menu-suspenso')

    menuSuspenso.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'))
    topoDireita.appendChild(menuSuspenso)
  }

  botaoToggle.addEventListener('click', () => {
    menuSuspenso.classList.toggle('aberto')
  })

  menuSuspenso.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => menuSuspenso.classList.remove('aberto'))
  })

  window.addEventListener('resize', () => {
    if (window.innerWidth > 958) {
      menuSuspenso.classList.remove('aberto')
    }
  })
}

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
// ALTERAR SENHA
// =========================
window.alterarSenha = async (usuario) => {
  const novaSenha = prompt("Digite a nova senha para " + usuario)
  if (!novaSenha) return

  const { error } = await supabase
    .from('usuarios')
    .update({ senha: novaSenha })
    .eq('usuario', usuario)

  if (error) showToast("Erro ao alterar senha", "erro")
  else showToast("Senha atualizada com sucesso", "sucesso")
}

// =========================
// DASHBOARD
// =========================
async function carregarDashboard() {
  const { count: produtos } = await supabase.from('produtos').select('*', { count: 'exact', head: true })
  const { count: colaboradores } = await supabase.from('colaboradores').select('*', { count: 'exact', head: true })
  const { count: dispensas } = await supabase.from('dispensas').select('*', { count: 'exact', head: true })

  document.getElementById('totalProdutos').innerText = produtos || 0
  document.getElementById('totalColaboradores').innerText = colaboradores || 0
  document.getElementById('totalDispensas').innerText = dispensas || 0

  await carregarResumoNovosCadastros()
}


async function carregarResumoNovosCadastros() {
  const [colaboradoresRecentes, produtosRecentes] = await Promise.all([
    buscarCadastrosRecentes('colaboradores', 30),
    buscarCadastrosRecentes('produtos', 30)
  ])

  const cardColaboradores = document.getElementById('novosColaboradores')
  const cardItens = document.getElementById('novosItens')

  if (cardColaboradores) cardColaboradores.innerText = colaboradoresRecentes.length
  if (cardItens) cardItens.innerText = produtosRecentes.length
}

function obterDataCadastro(item) {
  const dataBruta = item.created_at || item.data_cadastro || item.cadastrado_em || item.inserted_at || null
  if (!dataBruta) return null

  const data = new Date(dataBruta)
  if (Number.isNaN(data.getTime())) return null

  return data
}


async function buscarTodosRegistros(tabela) {
  const limitePagina = 1000
  let pagina = 0
  let resultado = []

  while (true) {
    const from = pagina * limitePagina
    const to = from + limitePagina - 1

    const { data, error } = await supabase.from(tabela).select('*').range(from, to)
    if (error || !data) break

    resultado = resultado.concat(data)

    if (data.length < limitePagina) break
    pagina++
  }

  return resultado
}

async function buscarCadastrosRecentes(tabela, dias = 30) {
  const data = await buscarTodosRegistros(tabela)
  if (!data.length) return []

  const agora = new Date()
  const limite = new Date()
  limite.setDate(agora.getDate() - dias)

  return data
    .map((item) => ({ ...item, _dataCadastro: obterDataCadastro(item) }))
    .filter((item) => item._dataCadastro && item._dataCadastro >= limite)
    .sort((a, b) => b._dataCadastro - a._dataCadastro)
}

let tipoCadastroAtual = 'colaboradores'
let cacheNovosCadastros = []

async function abrirModalNovosCadastros(tipoCadastro) {
  tipoCadastroAtual = tipoCadastro
  const modal = document.getElementById('modalNovosCadastros')
  if (!modal) return

  modal.classList.remove('hidden')

  const titulo = document.getElementById('tituloNovosCadastros')
  if (titulo) {
    titulo.innerText = tipoCadastro === 'colaboradores'
      ? 'Novos Colaboradores (últimos 30 dias)'
      : 'Novos Itens (últimos 30 dias)'
  }

  const sessao = JSON.parse(localStorage.getItem('usuarioLogado') || '{}')
  const isAdmin = sessao?.perfil === 'ADM'

  const btnExportar = document.getElementById('btnExportarNovosCadastros')
  btnExportar?.classList.toggle('hidden', !isAdmin)

  const colCpf = document.getElementById('colNovosCpf')
  if (colCpf) colCpf.style.display = tipoCadastro === 'colaboradores' ? '' : 'none'

  cacheNovosCadastros = await buscarCadastrosRecentes(tipoCadastro, 30)

  const tbody = document.getElementById('listaNovosCadastros')
  if (!tbody) return

  tbody.innerHTML = ''
  cacheNovosCadastros.forEach(item => {
    const tr = document.createElement('tr')
    const dataFormatada = item._dataCadastro
      ? item._dataCadastro.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      : '-'

    if (tipoCadastro === 'colaboradores') {
      const cpf = isAdmin ? (item.cpf || '-') : mascararCPF(item.cpf || '-')
      tr.innerHTML = `
        <td>${dataFormatada}</td>
        <td>${cpf}</td>
        <td>${item.nome || '-'}</td>
        <td>${item.empresa || '-'}</td>
      `
    } else {
      tr.innerHTML = `
        <td>${dataFormatada}</td>
        <td style="display:none"></td>
        <td>${item.nome || '-'}</td>
        <td>${item.codigo_mv || '-'}</td>
      `
    }

    tbody.appendChild(tr)
  })
}

function fecharModalNovosCadastros() {
  document.getElementById('modalNovosCadastros')?.classList.add('hidden')
}

function exportarNovosCadastrosPDF() {
  const sessao = JSON.parse(localStorage.getItem('usuarioLogado') || '{}')
  if (sessao?.perfil !== 'ADM') {
    showToast('Somente ADM pode exportar esta lista', 'alerta')
    return
  }

  const { jsPDF } = window.jspdf
  const doc = new jsPDF()
  const titulo = tipoCadastroAtual === 'colaboradores'
    ? 'Novos Colaboradores (30 dias)'
    : 'Novos Itens de Estoque (30 dias)'

  doc.text(titulo, 14, 20)

  const head = tipoCadastroAtual === 'colaboradores'
    ? [['Data', 'CPF', 'Nome', 'Empresa']]
    : [['Data', 'Nome', 'Código MV']]

  const body = cacheNovosCadastros.map(item => {
    const data = item._dataCadastro
      ? item._dataCadastro.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      : '-'

    if (tipoCadastroAtual === 'colaboradores') {
      return [data, item.cpf || '-', item.nome || '-', item.empresa || '-']
    }

    return [data, item.nome || '-', item.codigo_mv || '-']
  })

  doc.autoTable({ head, body })
  doc.save(gerarNomeArquivo(tipoCadastroAtual === 'colaboradores' ? 'novos_colaboradores' : 'novos_itens'))
}

// =========================
// TOAST + UTIL
// =========================
window.showToast = function(msg, tipo = "sucesso") {
  const toast = document.createElement("div")
  toast.className = `toast ${tipo}`
  toast.innerText = msg
  document.body.appendChild(toast)

  setTimeout(() => toast.classList.add("show"), 10)
  setTimeout(() => {
    toast.classList.remove("show")
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

window.gerarNomeArquivo = function(tipo) {
  const agora = new Date()
  const dia = String(agora.getDate()).padStart(2, '0')
  const mes = agora.toLocaleString('pt-BR', { month: 'short' })
  const ano = agora.getFullYear()
  const hora = String(agora.getHours()).padStart(2, '0')
  const minuto = String(agora.getMinutes()).padStart(2, '0')
  return `${tipo}_${dia}-${mes}-${ano}_${hora}-${minuto}.pdf`
}


function isAdminAtual() {
  const sessao = JSON.parse(localStorage.getItem('usuarioLogado') || '{}')
  return sessao?.perfil === 'ADM'
}

function mascararCPF(cpf) {
  cpf = cpf.replace(/[^\d]/g, '')
  if (cpf.length !== 11) return cpf
  return cpf.substring(0, 3) + '.' + cpf.substring(3, 6) + '.XXX-' + cpf.substring(9, 11)
}

// =========================
// MODAL DISPENSADOS
// =========================
async function abrirModalDispensados(local = null) {
  document.getElementById('modalDispensados').classList.remove('hidden')

  const titulo = document.querySelector('#modalDispensados h3')
  if (titulo) titulo.innerText = local ? `Colaboradores com Dispensas — ${local}` : 'Colaboradores com Dispensas'

  let query = supabase.from('dispensas').select('*')
  if (local) query = query.eq('usuario', local)

  const { data, error } = await query
  if (error) return showToast("Erro ao carregar dispensas", "erro")

  const mapa = {}
  data.forEach(item => {
    if (!mapa[item.cpf]) {
      mapa[item.cpf] = { 
        cpf: item.cpf, 
        nome: item.nome, 
        empresa: item.empresa, 
        funcao: item.funcao,   // nova coluna
        quantidade: 0 
      }
    }
    mapa[item.cpf].quantidade++
  })

  colaboradoresDispensados = mapa

  const tbody = document.getElementById("listaDispensados")
  tbody.innerHTML = ''

  Object.values(mapa).sort((a, b) => b.quantidade - a.quantidade).forEach(p => {
    const tr = document.createElement("tr")
    if (p.quantidade > 15) {
      tr.style.background = "#ffe0e0"
      tr.style.fontWeight = "bold"
    }
    tr.innerHTML = `
      <td>${isAdminAtual() ? (p.cpf || '-') : mascararCPF(p.cpf || '-')}</td>
      <td>${p.nome}</td>
      <td>${p.empresa}</td>
      <td>${p.funcao || "-"}</td>
      <td>${p.quantidade}</td>
    `
    tr.style.cursor = "pointer"
    tr.onclick = () => toggleHistorico(p.cpf, local)
    tbody.appendChild(tr)

    const trHistorico = document.createElement("tr")
    trHistorico.id = `historico-${p.cpf}`
    trHistorico.classList.add("hidden")
    trHistorico.innerHTML = `<td colspan="5"></td>`
    tbody.appendChild(trHistorico)
  })
}

function fecharModalDispensados() {
  document.getElementById('modalDispensados').classList.add('hidden')
}

async function toggleHistorico(cpf, local = null) {
  document.querySelectorAll("[id^='historico-']").forEach(h => h.classList.add("hidden"))
  const trHistorico = document.getElementById(`historico-${cpf}`)
  if (!trHistorico) return

  trHistorico.classList.remove("hidden")

  let query = supabase.from('dispensas').select('*').eq('cpf', cpf)
  if (local) query = query.eq('usuario', local)

  const { data, error } = await query.order('data_hora', { ascending: false })
  if (error) return showToast("Erro ao carregar histórico", "erro")

  const html = data.map(item => `
    <tr>
      <td><input type="checkbox" class="selecionar" checked></td>
      <td>${new Date(item.data_hora).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
      <td>${item.usuario}</td>
    </tr>
  `).join("")

  const imgBasePath = window.location.pathname.includes('/pages/') ? '../img' : 'img'
  trHistorico.querySelector("td").innerHTML = `
    <table style="width:100%">
      <thead><tr><th></th><th>Data/Hora</th><th>Local</th></tr></thead>
      <tbody>${html}</tbody>
    </table>
    <div style="margin-top:10px;">
      <button onclick="exportarHistoricoPDF('${cpf}')"><img src="${imgBasePath}/baixar.svg" alt="Exportar"> Exportar Selecionados</button>
    </div>
  `
}

// =========================
// EXPORTAR LISTA GERAL
// =========================
function exportarListaPDF() {
  const { jsPDF } = window.jspdf
  const doc = new jsPDF()
  doc.text("Lista de Colaboradores com Dispensas", 14, 20)

  const head = [["CPF", "Nome", "Empresa", "Função", "Qtd"]]
  const body = Array.from(document.querySelectorAll("#listaDispensados > tr:not([id^='historico-'])")).map(tr =>
    Array.from(tr.querySelectorAll("td")).map(td => td.innerText)
  )

  doc.autoTable({ head, body })
  doc.save(gerarNomeArquivo("lista_dispensados"))
}

// =========================
// EXPORTAR HISTÓRICO
// =========================
function exportarHistoricoPDF(cpf) {
  if (!cpf) {
    showToast("Abra o histórico de um colaborador para exportar.", "alerta")
    return
  }

  const colaborador = colaboradoresDispensados[cpf]
  const nome = colaborador?.nome || cpf
  const empresa = colaborador?.empresa || "-"
  const funcao = colaborador?.funcao || "-"

  const selecionados = []
  document.querySelectorAll(`#historico-${cpf} .selecionar:checked`).forEach(cb => {
    const linha = cb.closest("tr")
    const cols = Array.from(linha.querySelectorAll("td")).map(td => td.innerText)
    selecionados.push(cols)
  })

  if (selecionados.length === 0) {
    showToast("Nenhum registro selecionado", "alerta")
    return
  }

  const { jsPDF } = window.jspdf
  const doc = new jsPDF()
  doc.text(`Histórico de ${nome} (${cpf})`, 14, 20)
  doc.text(`Empresa: ${empresa}`, 14, 28)
  doc.text(`Função: ${funcao}`, 14, 36)

  doc.autoTable({
    startY: 42,
    head: [["", "Data/Hora", "Local"]],
    body: selecionados
  })

  doc.save(gerarNomeArquivo("historico"))
}

// =========================
// GRÁFICOS (importados do módulo)
// =========================
window.carregarGraficos = carregarGraficos
window.filtrarPeriodo = filtrarPeriodo
window.toggleFiltroPersonalizado = toggleFiltroPersonalizado

// =========================
// DISPENSADOS (funções globais)
// =========================
window.abrirModalDispensados = abrirModalDispensados
window.abrirModalDispensadosPorLocal = abrirModalDispensados
window.fecharModalDispensados = fecharModalDispensados
window.exportarListaPDF = exportarListaPDF
window.exportarHistoricoPDF = exportarHistoricoPDF
window.abrirModalNovosCadastros = abrirModalNovosCadastros
window.fecharModalNovosCadastros = fecharModalNovosCadastros
window.exportarNovosCadastrosPDF = exportarNovosCadastrosPDF
