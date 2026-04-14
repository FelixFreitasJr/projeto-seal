import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let itensPedido = []

// Preview dinâmico ao digitar código
async function previewCodigo(codigo) {
  codigo = codigo.trim() // remove espaços extras
  if (!codigo) {
    document.getElementById("previewItem").innerText = ""
    document.getElementById("qtdFat").innerText = "—"
    return
  }

  const { data, error } = await supabase
    .from('produtos')
    .select('nome, quantidade_faturamento, codigo_sga')
    .eq('codigo_mv', codigo) // busca apenas por codigo_mv
    .maybeSingle()

  if (error || !data) {
    document.getElementById("previewItem").innerText = "Não encontrado"
    document.getElementById("qtdFat").innerText = "—"
  } else {
    document.getElementById("previewItem").innerText = data.nome
    document.getElementById("qtdFat").innerText = data.quantidade_faturamento || "—"
  }
}

// Incluir item na lista
async function incluirItem() {
  let codigo = document.getElementById("codigo").value.trim()
  let quantidade = document.getElementById("quantidade").value.trim()

  if (!codigo || !quantidade) return

  const { data, error } = await supabase
    .from('produtos')
    .select('nome, quantidade_faturamento, codigo_sga')
    .eq('codigo_mv', codigo)
    .maybeSingle()

  if (error || !data) {
    showToast("Item não encontrado")
    return
  }

  itensPedido.push({
    codigo: codigo,
    codigo_sga: data.codigo_sga || null,
    nome: data.nome,
    quantidade_faturamento: data.quantidade_faturamento || "—",
    quantidade: parseInt(quantidade, 10)
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
      <td>${i.codigo}</td>
      <td>${i.codigo_sga || "—"}</td>
      <td>${i.nome}</td>
      <td>${i.quantidade_faturamento}</td>
      <td>${i.quantidade}</td>
      <td class="acoes">
          <button onclick="editarItem(${idx})"><img src="../img/editar.svg" alt="Editar"> Editar</button>
          <button onclick="excluirItem(${idx})"><img src="../img/excluir.svg" alt="Excluir"> Excluir</button>
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

// Finalizar pedido → abre modal
function finalizarPedido() {
  const modal = document.getElementById("modalResumo")
  modal.classList.remove("hidden")

  document.getElementById("resumoPedidos").innerHTML = itensPedido.map(i =>
    `<tr><td>${i.codigo}</td><td>${i.nome}</td><td>${i.quantidade}</td></tr>`
  ).join("")
}

// Salvar pedido no banco
async function salvarPedido() {
  const usuario = prompt("Digite seu nome:") || "ADM"

  const { data, error } = await supabase.from('pedidos').insert({
    usuario: usuario,
    data: new Date().toISOString(),
    status: "aberto"
  }).select()

  if (error || !data) {
    showToast("Erro ao salvar pedido", "erro")
    return
  }

  const pedidoId = data[0].id

for (const item of itensPedido) {
  const { error } = await supabase.from('pedido_itens').insert({
    pedido_id: pedidoId,
    codigo_mv: item.codigo,
    codigo_sga: item.codigo_sga || null,   // se quiser manter, mesmo vazio
    nome: item.nome,
    quantidade: item.quantidade,
    quantidade_faturamento: item.quantidade_faturamento || null  // se quiser manter, mesmo vazio
  })

  if (error) {
    console.error("Erro ao salvar item:", error)
    showToast("Erro ao salvar item do pedido", "erro")
  }
}

  showToast("Pedido salvo com sucesso por ${usuario}", "sucesso")
  itensPedido = []
  renderLista()
  fecharModal()
  carregarHistorico()
}

// Imprimir pedido atual
async function imprimirPedido(pedidoId) {
  // busca itens do pedido
const { data, error } = await supabase
  .from('pedido_itens')
  .select('codigo_mv, codigo_sga, nome, quantidade, quantidade_faturamento')
  .eq('pedido_id', pedidoId)

doc.autoTable({
  head: [["Código MV", "Código SGA", "Nome", "Qtd. Fat.", "Qtd. Solicitada"]],
  body: data.map(i => [
    i.codigo_mv,
    i.codigo_sga || "—",
    i.nome,
    i.quantidade_faturamento || "—",
    i.quantidade
  ])
})

  if (error || !data) {
    showToast("Erro ao buscar itens do pedido", "erro")
    return
  }

  const { jsPDF } = window.jspdf
  const doc = new jsPDF()
  doc.text(`Pedido ${pedidoId}`, 14, 20)
  doc.autoTable({
    head: [["Código", "Nome", "Qtd. Fat.", "Qtd. Solicitada"]],
    body: data.map(i => [i.codigo_mv, i.nome, i.quantidade_faturamento || "—", i.quantidade])
  })
  doc.save(`pedido_${pedidoId}.pdf`)
}


// Salvar e imprimir
async function salvarEImprimir() {
  await salvarPedido()
  exportarPDF()
}

// Fechar modal
function fecharModal() {
  document.getElementById("modalResumo").classList.add("hidden")
}

// Carregar histórico de pedidos
async function carregarHistorico() {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, data')
    .order('data', { ascending: false })

  if (error) {
    console.error(error)
    return
  }

  document.getElementById("listaHistorico").innerHTML = data.map(p => `
    <tr>
      <td>${new Date(p.data).toLocaleDateString()}</td>
      <td>${p.id}</td>
      <td><!-- quantidade de itens pode ser buscada com join --></td>
      <td><button onclick="imprimirPedido(${p.id})">Imprimir</button></td>
    </tr>
  `).join("")
}

// Exportar PDF
function exportarPDF() {
  const { jsPDF } = window.jspdf   // ajuste para UMD
  const doc = new jsPDF()
  doc.text("Pedido de Material", 14, 20)
  doc.autoTable({
    head: [["Código", "Nome", "Qtd. Fat.", "Qtd. Solicitada"]],
    body: itensPedido.map(i => [i.codigo, i.nome, i.quantidade_faturamento, i.quantidade])
  })
  doc.save("pedido.pdf")
}

// Eventos
document.getElementById("codigo").addEventListener("input", e => previewCodigo(e.target.value))
document.getElementById("btnIncluir").addEventListener("click", incluirItem)
document.getElementById("btnFinalizar").addEventListener("click", finalizarPedido)
document.getElementById("btnPDF").addEventListener("click", exportarPDF)

// Expor funções globais
window.editarItem = editarItem
window.excluirItem = excluirItem
window.previewCodigo = previewCodigo
window.salvarPedido = salvarPedido
window.imprimirPedido = imprimirPedido
window.salvarEImprimir = salvarEImprimir
window.fecharModal = fecharModal
window.carregarHistorico = carregarHistorico
