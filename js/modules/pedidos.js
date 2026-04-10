import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let itensPedido = []

// Buscar item pelo código
async function buscarItemPorCodigo(codigo) {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .or(`codigo_mv.eq.${codigo},codigo_sga.eq.${codigo}`)
    .single()

  if (error || !data) {
    document.getElementById("previewItem").innerText = "Item não encontrado"
    return null
  }

  document.getElementById("previewItem").innerText = `Item encontrado: ${data.nome}`
  return data
}

// Incluir item na lista
async function incluirItem() {
  const codigo = document.getElementById("codigo").value
  const quantidade = document.getElementById("quantidade").value

  if (!codigo || !quantidade) return

  const item = await buscarItemPorCodigo(codigo)
  if (!item) return

  itensPedido.push({
    codigo: codigo,
    nome: item.nome,
    quantidade: quantidade
  })

  renderLista()
}

// Renderizar lista
function renderLista() {
  const tbody = document.getElementById("listaPedidos")
  tbody.innerHTML = itensPedido.map((i, idx) => `
    <tr>
      <td>${i.codigo}</td>
      <td>${i.nome}</td>
      <td>${i.quantidade}</td>
      <td>
        <button onclick="editarItem(${idx})">Editar</button>
        <button onclick="excluirItem(${idx})">Excluir</button>
      </td>
    </tr>
  `).join("")
}

// Editar item
function editarItem(idx) {
  const novoQtd = prompt("Nova quantidade:", itensPedido[idx].quantidade)
  if (novoQtd) {
    itensPedido[idx].quantidade = novoQtd
    renderLista()
  }
}

// Excluir item
function excluirItem(idx) {
  itensPedido.splice(idx, 1)
  renderLista()
}

// Finalizar pedido
async function finalizarPedido() {
  const { data, error } = await supabase.from('pedidos').insert({
    usuario: "teste", // depois usar getUser()
    data: new Date().toISOString(),
    itens: itensPedido
  })

  if (error) {
    alert("Erro ao salvar pedido")
  } else {
    alert("Pedido salvo com sucesso")
    itensPedido = []
    renderLista()
  }
}

// Exportar PDF
function exportarPDF() {
  const doc = new jsPDF()
  doc.text("Pedido de Material", 14, 20)
  doc.autoTable({
    head: [["Código", "Nome", "Quantidade"]],
    body: itensPedido.map(i => [i.codigo, i.nome, i.quantidade])
  })
  doc.save("pedido.pdf")
}

// Eventos
document.getElementById("btnIncluir").addEventListener("click", incluirItem)
document.getElementById("btnFinalizar").addEventListener("click", finalizarPedido)
document.getElementById("btnPDF").addEventListener("click", exportarPDF)

// Expor funções globais para botões inline
window.editarItem = editarItem
window.excluirItem = excluirItem
