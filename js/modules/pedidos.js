import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let itensPedido = []

// Preview dinâmico ao digitar código
async function previewCodigo(codigo) {
  if (!codigo) {
    document.getElementById("previewItem").innerText = ""
    return
  }

  const { data, error } = await supabase
    .from('produtos')
    .select('nome')
    .or(`codigo_mv.eq.${codigo},codigo_sga.eq.${codigo}`)
    .single()

  if (error || !data) {
    document.getElementById("previewItem").innerText = "Não encontrado"
  } else {
    document.getElementById("previewItem").innerText = data.nome
  }
}

// Incluir item na lista
async function incluirItem() {
  const codigo = document.getElementById("codigo").value.trim()
  const quantidade = document.getElementById("quantidade").value.trim()

  if (!codigo || !quantidade) return

  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .or(`codigo_mv.eq.${codigo},codigo_sga.eq.${codigo}`)
    .single()

  if (error || !data) {
    alert("Item não encontrado")
    return
  }

  itensPedido.push({
    codigo: codigo,
    nome: data.nome,
    quantidade: quantidade
  })

  renderLista()
  document.getElementById("codigo").value = ""
  document.getElementById("quantidade").value = ""
  document.getElementById("previewItem").innerText = ""
}

// Renderizar lista com menu ⋮
function renderLista() {
  const tbody = document.getElementById("listaPedidos")
  tbody.innerHTML = itensPedido.map((i, idx) => `
    <tr>
      <td>${i.codigo}</td>
      <td>${i.nome}</td>
      <td>${i.quantidade}</td>
      <td class="acoes">
        <button class="btn-menu" onclick="toggleMenu(${idx})">⋮</button>
        <div id="menu-${idx}" class="menu-acoes hidden">
          <button onclick="editarItem(${idx})">Editar</button>
          <button onclick="excluirItem(${idx})">Excluir</button>
        </div>
      </td>
    </tr>
  `).join("")
}

// Alternar menu de ações
function toggleMenu(idx) {
  const menu = document.getElementById(`menu-${idx}`)
  menu.classList.toggle("hidden")
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
    status: "aberto"
  }).select()

  if (error || !data) {
    alert("Erro ao salvar pedido")
    return
  }

  const pedidoId = data[0].id

  // Inserir itens vinculados
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
document.getElementById("codigo").addEventListener("input", e => previewCodigo(e.target.value))
document.getElementById("btnIncluir").addEventListener("click", incluirItem)
document.getElementById("btnFinalizar").addEventListener("click", finalizarPedido)
document.getElementById("btnPDF").addEventListener("click", exportarPDF)

// Expor funções globais para botões inline
window.editarItem = editarItem
window.excluirItem = excluirItem
window.toggleMenu = toggleMenu