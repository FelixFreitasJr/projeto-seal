import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let itensPedido = []

// Preview dinâmico ao digitar código
async function previewCodigo(codigo) {
  if (!codigo) {
    document.getElementById("previewItem").innerText = ""
    document.getElementById("qtdFat").innerText = "—"
    return
  }

  const { data, error } = await supabase
    .from('produtos')
    .select('nome, quantidade_faturamento')
    .or(`codigo_mv.eq."${codigo}",codigo_sga.eq."${codigo}"`)
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
  const codigo = document.getElementById("codigo").value.trim()
  const quantidade = document.getElementById("quantidade").value.trim()

  if (!codigo || !quantidade) return

  const { data, error } = await supabase
    .from('produtos')
    .select('nome, quantidade_faturamento')
    .or(`codigo_mv.eq."${codigo}",codigo_sga.eq."${codigo}"`)
    .maybeSingle()

  if (error || !data) {
    alert("Item não encontrado")
    return
  }

  itensPedido.push({
    codigo: codigo,
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
  const { data, error } = await supabase.from('pedidos').insert({
    usuario: "ADM",
    data: new Date().toISOString(),
    status: "aberto"
  }).select()

  if (error || !data) {
    alert("Erro ao salvar pedido")
    return
  }

  const pedidoId = data[0].id

  for (const item of itensPedido) {
    await supabase.from('pedido_itens').insert({
      pedido_id: pedidoId,
      codigo_mv: item.codigo,
      nome: item.nome,
      quantidade: item.quantidade
    })
  }

  alert("Pedido salvo com sucesso")
  itensPedido = []
  renderLista()
  fecharModal()
  carregarHistorico()
}

// Imprimir pedido atual
function imprimirPedido() {
  exportarPDF()
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
