import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 🔥 controle de edição
let modoEdicaoProduto = null
let ordenacao = { campo: 'nome', asc: true }

const mapaOrdenacao = {
  codigo: 'codigo_mv',
  codigo_sga: 'codigo_sga',
  nome: 'nome',
  endereco_externo: 'endereco_externo',
  endereco_satelite: 'endereco_satelite',
  quantidade_faturamento: 'quantidade_faturamento'
}

export function initEstoque() {
  const user = JSON.parse(localStorage.getItem("usuarioLogado"))
  const isAdmin = user?.perfil === "ADM"

  const tabela = document.getElementById('tabelaEstoque')
  const busca = document.getElementById('busca')

  // Ajusta cabeçalho conforme perfil
  const thExterno = document.querySelector("th[onclick*='endereco_externo']")
  const thSatelite = document.querySelector("th[onclick*='endereco_satelite']")

  if (user?.perfil === "EXTERNO") {
    thSatelite?.remove()   // remove coluna Satélite
    if (thExterno) thExterno.innerText = "Endereço"
  } else if (user?.perfil === "SATELITE") {
    thExterno?.remove()    // remove coluna Externo
    if (thSatelite) thSatelite.innerText = "Endereço"
  } else if (isAdmin) {
    // mantém as duas colunas com nomes originais
  }

  // =========================
  // BUSCAR / LISTAR
  // =========================
  async function buscar() {
    const termo = busca?.value?.trim() || ''

    let query = supabase
      .from('produtos')
      .select('*')
      .order(ordenacao.campo, { ascending: ordenacao.asc })

    if (termo) {
      query = query.or(
        `codigo_mv.ilike.%${termo}%,codigo_sga.ilike.%${termo}%,nome.ilike.%${termo}%,endereco_externo.ilike.%${termo}%,endereco_satelite.ilike.%${termo}%,liberacao.ilike.%${termo}%,observacao.ilike.%${termo}%`
      )
    }

    const { data, error } = await query
    if (error) {
      console.error(error)
      return
    }

    renderTabela(data)
    atualizarContador(data.length)
  }

  function renderTabela(data) {
    let linhas = ''

    data.forEach(item => {
      linhas += `
      <tr>
        <td class="codigo">${escapeHtml(item.codigo_mv)}</td>
        ${isAdmin ? `<td class="col-sga">${escapeHtml(item.codigo_sga)}</td>` : ''}
        <td>
          <div style="font-weight: bold;">${escapeHtml(item.nome)}</div>
          <div class="status-container">
            <div class="status ${formatarStatusClasse(item.liberacao)}">
              ${escapeHtml(item.liberacao || '-')}
            </div>
            <div class="info-extra">| ${escapeHtml(item.observacao || '-')}</div>
          </div>
        </td>
        ${user?.perfil === "EXTERNO" ? `
          <td>${escapeHtml(item.endereco_externo)}</td>
        ` : user?.perfil === "SATELITE" ? `
          <td>${escapeHtml(item.endereco_satelite)}</td>
        ` : `
          <td>${escapeHtml(item.endereco_externo)}</td>
          <td>${escapeHtml(item.endereco_satelite)}</td>
        `}
        ${isAdmin ? `
        <td class="qtdFat">${escapeHtml(item.quantidade_faturamento || '—')}</td>
        <td>
          <div class="acoes-estoque">
            <button class="btn-editar" onclick="editarProduto('${item.id}')">
              <img src="../img/editar.svg" alt="Editar"> Editar
            </button>
            <button class="btn-clonar" onclick="clonarItem('${item.id}')">
              <img src="../img/clonar.svg" alt="Clonar"> Clonar
            </button>
            <button class="btn-excluir" onclick="excluirProduto('${item.id}')">
              <img src="../img/excluir.svg" alt="Excluir"> Excluir
            </button>
          </div>
        </td>` : ''}
      </tr>`
    })

    tabela.innerHTML = linhas
  }

  function atualizarContador(qtd) {
    const contador = document.getElementById("contadorEstoque")
    if (contador) contador.innerText = "Itens: " + qtd
  }

  // dispara primeira busca
  buscar()


  // =========================
  // EVENTOS
  // =========================
  busca?.addEventListener('input', () => {
    clearTimeout(timeout)
    timeout = setTimeout(buscar, 300)
  })

  document.getElementById('limparBusca')?.addEventListener('click', () => {
    if (busca) busca.value = ''
    buscar()
  })

  document.getElementById("btnNovo")?.addEventListener("click", () => {
    modoEdicaoProduto = null
    limparCampos()
    abrirModal()
  })

  document.getElementById("btnCancelar")?.addEventListener("click", fecharModal)
  document.getElementById("btnSalvar")?.addEventListener("click", salvarProduto)
  carregarSugestoesEndereco()



window.atualizarEstoque = buscar
}
// =========================
// CRUD PRODUTO
// =========================
async function salvarProduto() {
  const codigo_mv = document.getElementById("codigo_mv").value
  const codigo_sga = document.getElementById("codigo_sga").value
  const nome = document.getElementById("nome").value
  const externo = document.getElementById("externo").value
  const satelite = document.getElementById("satelite").value
  const observacao = document.getElementById("observacao").value
  const liberacao = document.getElementById("liberacao").value
  const quantidade_faturamento = document.getElementById("quantidade_faturamento").value

  if (!codigo_mv || !nome) {
    showToast("Preencha código MV e nome", "alerta")
    return
  }

  const dados = {
    codigo_mv: codigo_mv.toUpperCase(),
    codigo_sga: codigo_sga.toUpperCase(),
    nome: nome.toUpperCase(),
    endereco_externo: externo.toUpperCase(),
    endereco_satelite: satelite.toUpperCase(),
    observacao: observacao.toUpperCase(),
    liberacao: liberacao.toUpperCase(),
    quantidade_faturamento: quantidade_faturamento || null
  }


  if (modoEdicaoProduto) {
    const { error } = await supabase.from('produtos').update(dados).eq('id', modoEdicaoProduto)
    if (error) return showToast("Erro ao atualizar", "erro")
    showToast("Item atualizado", "sucesso")
    modoEdicaoProduto = null
  } else {
    const { error } = await supabase.from('produtos').insert(dados)
    if (error) return showToast("Erro ao salvar", "erro")
    showToast("Item cadastrado", "sucesso")
  }

  window.atualizarEstoque?.()
  await carregarSugestoesEndereco()
  fecharModal()
  limparCampos()
}

async function editarProduto(id) {
  modoEdicaoProduto = id
  const { data, error } = await supabase.from('produtos').select('*').eq('id', id).single()
  if (error || !data) return showToast("Item não encontrado", "erro")

  document.getElementById("codigo_mv").value = data.codigo_mv
  document.getElementById("codigo_sga").value = data.codigo_sga
  document.getElementById("nome").value = data.nome
  document.getElementById("externo").value = data.endereco_externo
  document.getElementById("satelite").value = data.endereco_satelite
  document.getElementById("observacao").value = data.observacao || ''
  document.getElementById("liberacao").value = data.liberacao || 'LIVRE'
  document.getElementById("quantidade_faturamento").value = data.quantidade_faturamento || ''

  abrirModal()
}

async function excluirProduto(id) {
  const confirmarExclusao = window.confirm("Tem certeza que deseja excluir este item?")
  if (!confirmarExclusao) return

  const { error } = await supabase.from('produtos').delete().eq('id', id)
  if (error) showToast("Erro ao excluir", "erro")
  else {
    showToast("Item excluído", "sucesso")
    window.atualizarEstoque?.()
  }
}

async function clonarItem(id) {
  const { data, error } = await supabase.from('produtos').select('*').eq('id', id).single()
  if (error || !data) return showToast("Erro ao clonar", "erro")

  const clone = { ...data }
  delete clone.id

  const { error: insertError } = await supabase.from('produtos').insert(clone)
  if (insertError) showToast("Erro ao salvar clone", "erro")
  else {
    showToast("Item clonado", "sucesso")
    window.atualizarEstoque?.()
  }
}

// =========================
// UI
// =========================
function abrirModal() {
  const tituloModal = document.querySelector("#modal h3")
  tituloModal.innerText = modoEdicaoProduto ? "Atualizar Item" : "Novo Item"
  document.getElementById("modal").classList.remove("hidden")
}

function fecharModal() {
  document.getElementById("modal").classList.add("hidden")
}

function limparCampos() {
  document.querySelectorAll("#modal input, #modal textarea, #modal select").forEach(i => i.value = "")
}

// =========================
// UTIL
// =========================
function formatarStatusClasse(status) {
  if (!status) return ''
  status = status.toLowerCase()
  if (status.includes('livre')) return 'livre'
  if (status.includes('externo')) return 'externo'
  if (status.includes('satélite') || status.includes('satelite')) return 'satelite'
  if (status.includes('inativo')) return 'inativo'
  if (status.includes('supervisão')) return 'supervisao'
  if (status.includes('prescrição')) return 'prescricao'
  if (status.includes('cme')) return 'cme'
  if (status.includes('paciente')) return 'paciente'
  return ''
}


function escapeHtml(value) {
  if (value == null) return ''

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

async function carregarSugestoesEndereco() {
  const { data, error } = await supabase
    .from('produtos')
    .select('endereco_externo, endereco_satelite')

  if (error || !data) return

  preencherDatalist('sugestoesEnderecoExterno', data.map(item => item.endereco_externo))
  preencherDatalist('sugestoesEnderecoSatelite', data.map(item => item.endereco_satelite))
}

function preencherDatalist(id, valores = []) {
  const datalist = document.getElementById(id)
  if (!datalist) return

  const unicos = [...new Set(
    valores
      .map(v => String(v || '').trim().toUpperCase())
      .filter(Boolean)
  )]

  datalist.innerHTML = unicos.map(valor => `<option value="${escapeHtml(valor)}"></option>`).join('')
}
function toggleMenu(btn) {
  const menu = btn.nextElementSibling
  menu.classList.toggle("hidden")
}

window.toggleMenu = toggleMenu

function exportarEstoquePDF() {
  const { jsPDF } = window.jspdf
  const doc = new jsPDF()

  doc.text("Relatório de Estoque", 14, 20)

  // Cabeçalho da tabela
  const head = [["Código MV", "Código SGA", "Nome", "Externo", "Satélite", "Qtd. Faturamento"]]

  // Linhas da tabela atual renderizada
  const body = Array.from(document.querySelectorAll("#tabelaEstoque tr")).map(tr =>
    Array.from(tr.querySelectorAll("td")).map(td => td.innerText)
  )

  doc.autoTable({ head, body })
  doc.save(gerarNomeArquivo("estoque"))
}

// =========================
// GLOBAL
// =========================
window.editarProduto = editarProduto
window.excluirProduto = excluirProduto
window.clonarItem = clonarItem
window.formatarStatusClasse = formatarStatusClasse

function ordenarTabela(_tabela, campo) {
  const campoBanco = mapaOrdenacao[campo] || 'nome'

  if (ordenacao.campo === campoBanco) {
    ordenacao.asc = !ordenacao.asc
  } else {
    ordenacao.campo = campoBanco
    ordenacao.asc = true
  }

  window.atualizarEstoque?.()
}

window.ordenarTabela = ordenarTabela
