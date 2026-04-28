import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { getUser } from '../auth.js'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let itensPedido = []
let salvandoPedido = false

function escapeHtml(value) {
  if (value == null) return ''
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function normalizarQuantidadeFaturamento(valor) {
  if (valor == null || valor === '' || valor === '—') return null
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

function formatarDataHoraBrasilia(dataISO) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date(dataISO))
}

async function buscarProdutoPorCodigo(codigo) {
  const codigoNormalizado = codigo.trim()
  if (!codigoNormalizado) return null

  const { data, error } = await supabase
    .from('produtos')
    .select('nome, quantidade_faturamento, codigo_sga, codigo_mv')
    .or(`codigo_mv.eq.${codigoNormalizado},codigo_sga.eq.${codigoNormalizado}`)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar produto:', error)
    return null
  }

  return data || null
}

// Preview dinâmico ao digitar código
async function previewCodigo(codigo) {
  codigo = codigo.trim()
  if (!codigo) {
    document.getElementById("previewItem").innerText = ""
    document.getElementById("qtdFat").innerText = "—"
    return
  }

  const data = await buscarProdutoPorCodigo(codigo)

  if (!data) {
    document.getElementById("previewItem").innerText = "Não encontrado"
    document.getElementById("qtdFat").innerText = "—"
    return
  }

  document.getElementById("previewItem").innerText = data.nome
  document.getElementById("qtdFat").innerText = data.quantidade_faturamento || "—"
}

// Incluir item na lista
async function incluirItem() {
  let codigo = document.getElementById("codigo").value.trim()
  let quantidade = document.getElementById("quantidade").value.trim()
  if (!codigo || !quantidade) return

  const qtdNumerica = parseInt(quantidade, 10)
  if (Number.isNaN(qtdNumerica) || qtdNumerica <= 0) {
    showToast("Informe uma quantidade válida", "alerta")
    return
  }

  const data = await buscarProdutoPorCodigo(codigo)

  if (!data) {
    showToast("Item não encontrado", "alerta")
    return
  }

  itensPedido.push({
    codigo: (data.codigo_mv || codigo).toString().toUpperCase(),
    codigo_sga: data.codigo_sga || null,
    nome: data.nome,
    quantidade_faturamento: data.quantidade_faturamento || "—",
    quantidade: qtdNumerica
  })

  renderLista()
  document.getElementById("codigo").value = ""
  document.getElementById("quantidade").value = ""
  document.getElementById("previewItem").innerText = ""
  document.getElementById("qtdFat").innerText = "—"
  document.getElementById("codigo").focus()
}

// Renderizar lista
function renderLista() {
  const tbody = document.getElementById("listaPedidos")
  if (!tbody) return

  tbody.innerHTML = itensPedido.map((i, idx) => `
    <tr>
      <td>${escapeHtml(i.codigo)}</td>
      <td>${escapeHtml(i.codigo_sga || "—")}</td>
      <td>${escapeHtml(i.nome)}</td>
      <td>${escapeHtml(i.quantidade_faturamento)}</td>
      <td>${i.quantidade}</td>
      <td class="acoes-pedidos">
          <button class="btn-editar" onclick="editarItem(${idx})"><img src="../img/editar.svg" alt="Editar"> Editar</button>
          <button class="btn-excluir" onclick="excluirItem(${idx})"><img src="../img/excluir.svg" alt="Excluir"> Excluir</button>
      </td>
    </tr>
  `).join("")
}

// Editar item
function editarItem(idx) {
  const novoQtd = prompt("Nova quantidade:", itensPedido[idx].quantidade)
  if (novoQtd) {
    itensPedido[idx].quantidade = parseInt(novoQtd, 10)
    renderLista()
  }
}

// Excluir item
function excluirItem(idx) {
  itensPedido.splice(idx, 1)
  renderLista()
}

// Finalizar pedido → salva e abre modal
async function finalizarPedido() {
  if (itensPedido.length === 0) {
    showToast("Inclua ao menos um item no pedido", "alerta")
    return
  }

  document.getElementById("resumoPedidos").innerHTML = itensPedido.map(i =>
    `<tr>
       <td>${i.codigo}</td>
       <td>${i.nome}</td>
       <td>${i.quantidade_faturamento}</td>
       <td><strong>${i.quantidade}</strong></td>
     </tr>`
  ).join("")
  document.getElementById("modalResumo").classList.remove("hidden")
}

// Salvar pedido localmente como relatório em PDF
async function salvarPedido() {
  if (salvandoPedido) return null

  if (!itensPedido.length) {
    showToast("Inclua ao menos um item antes de salvar", "alerta")
    return null
  }

  salvandoPedido = true

  try {
    const usuarioInput = document.getElementById("usuarioPedido")
    const usuario = usuarioInput?.value.trim() || getUser() || "ADM"
    const codigoPedido = `PED-${Date.now()}`
    const dataCriacao = new Date().toISOString()

    const { jsPDF } = window.jspdf
    const doc = new jsPDF()
    doc.text(`Pedido ${codigoPedido}`, 14, 20)
    doc.text(`Usuário: ${usuario}`, 14, 28)
    doc.text(`Criado em: ${formatarDataHoraBrasilia(dataCriacao)}`, 14, 36)
    doc.autoTable({
      startY: 44,
      head: [["Código MV", "Código SGA", "Descrição", "Qtd. Fat.", "Qtd. Solicitada"]],
      body: itensPedido.map(item => [
        item.codigo,
        item.codigo_sga || "—",
        item.nome,
        normalizarQuantidadeFaturamento(item.quantidade_faturamento) ?? "—",
        item.quantidade
      ])
    })
    doc.save(gerarNomeArquivo(`pedido_${codigoPedido}`))

    showToast(`Pedido gerado com sucesso por ${usuario}`, "sucesso")

    itensPedido = []
    renderLista()
    fecharModal()

    return codigoPedido
  } finally {
    salvandoPedido = false
  }
}

// Imprimir pedido já salvo
async function imprimirPedido(pedidoId) {
  const { data: itens, error } = await supabase
    .from('pedido_itens')
    .select('codigo_mv, codigo_sga, nome, quantidade, quantidade_faturamento')
    .eq('pedido_id', pedidoId)

  if (error || !itens) {
    showToast("Erro ao buscar itens do pedido", "erro")
    return
  }

  const { data: pedidoInfo } = await supabase
    .from('pedidos')
    .select('codigo, usuario, data')
    .eq('id', pedidoId)
    .maybeSingle()

  const { jsPDF } = window.jspdf
  const doc = new jsPDF()
  const codigoPedido = pedidoInfo?.codigo || `#${pedidoId}`
  const usuarioImpressao = getUser() || 'N/D'
  const dataHoraImpressao = formatarDataHoraBrasilia(new Date().toISOString())
  doc.text(`Pedido ${codigoPedido}`, 14, 20)
  if (pedidoInfo?.usuario) {
    doc.text(`Usuário: ${pedidoInfo.usuario}`, 14, 28)
  }
  if (pedidoInfo?.data) {
    doc.text(`Criado em: ${formatarDataHoraBrasilia(pedidoInfo.data)}`, 14, 36)
  }
  doc.text(`Impresso por: ${usuarioImpressao}`, 14, pedidoInfo?.data ? 44 : 36)
  doc.text(`Impresso em: ${dataHoraImpressao}`, 14, pedidoInfo?.data ? 52 : 44)
  doc.autoTable({
    startY: pedidoInfo?.data ? 58 : 50,
    head: [["Código MV", "Código SGA", "Descrição", "Qtd. Fat.", "Qtd. Solicitada"]],
    body: itens.map(i => [
      i.codigo_mv,
      i.codigo_sga || "—",
      i.nome,
      i.quantidade_faturamento || "—",
      i.quantidade
    ])
  })
  doc.save(gerarNomeArquivo(`pedido_${codigoPedido}`))
}

// Exportar apenas selecionados
async function exportarSelecionados() {
  const selecionados = Array.from(document.querySelectorAll(".chkPedido:checked")).map(chk => chk.value)

  if (selecionados.length === 0) {
    showToast("Nenhum pedido selecionado", "alerta")
    return
  }

  const { jsPDF } = window.jspdf
  const doc = new jsPDF()

  for (let idx = 0; idx < selecionados.length; idx += 1) {
    const pedidoId = selecionados[idx]
    const { data, error } = await supabase
      .from('pedido_itens')
      .select('codigo_mv, codigo_sga, nome, quantidade, quantidade_faturamento')
      .eq('pedido_id', pedidoId)

    if (error || !data) continue

    doc.text(`Pedido ${pedidoId}`, 14, 20)
    doc.autoTable({
      head: [["Código MV", "Código SGA", "Descrição", "Qtd. Fat.", "Qtd. Solicitada"]],
      body: data.map(i => [
        i.codigo_mv,
        i.codigo_sga || "—",
        i.nome,
        i.quantidade_faturamento || "—",
        i.quantidade
      ])
    })
    if (idx < selecionados.length - 1) doc.addPage()
  }

  doc.save(gerarNomeArquivo("pedidos_selecionados"))
}

// Fechar modal de resumo
function fecharModal() {
  document.getElementById("modalResumo").classList.add("hidden")
}

// Fechar modal de histórico
function fecharHistorico() {
  document.getElementById("modalHistorico").classList.add("hidden")
}

// Carregar histórico de pedidos
async function carregarHistorico() {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, codigo, usuario, data')
    .order('data', { ascending: false })

  if (error) {
    console.error(error)
    return
  }

  document.getElementById("listaHistorico").innerHTML = data.map(p => `
    <tr>
      <td>${escapeHtml(p.codigo)}</td>
      <td>${escapeHtml(p.usuario)}</td>
      <td>${formatarDataHoraBrasilia(p.data)}</td>
      <td>
        <div class="acoes-historico">
          <input type="checkbox" class="chkPedido" value="${p.id}">
          <button type="button" class="btn-editar" onclick="imprimirPedido('${p.id}')">Imprimir</button>
        </div>
      </td>
    </tr>
  `).join("")
}

// Abrir pedido do histórico e mostrar itens
async function abrirPedido(pedidoId) {
  const { data, error } = await supabase
    .from('pedido_itens')
    .select('*')
    .eq('pedido_id', pedidoId)

  if (error) {
    showToast("Erro ao buscar itens", "erro")
    return
  }

  document.getElementById("resumoPedidos").innerHTML = data.map(i =>
    `<tr>
       <td>${i.codigo_mv}</td>
       <td>${i.nome}</td>
       <td>${i.quantidade_faturamento || "—"}</td>
       <td><strong>${i.quantidade}</strong></td>
     </tr>`
  ).join("")

  document.getElementById("modalResumo").classList.remove("hidden")
}

// Eventos principais
document.getElementById("codigo").addEventListener("input", e => previewCodigo(e.target.value))
document.getElementById("btnIncluir").addEventListener("click", incluirItem)
document.getElementById("btnFinalizar").addEventListener("click", finalizarPedido)

// Expor funções globais para uso no HTML
window.editarItem = editarItem
window.excluirItem = excluirItem
window.previewCodigo = previewCodigo
window.salvarPedido = salvarPedido
window.imprimirPedido = imprimirPedido
window.fecharModal = fecharModal
window.carregarHistorico = carregarHistorico
window.abrirPedido = abrirPedido
window.exportarSelecionados = exportarSelecionados
window.fecharHistorico = fecharHistorico
