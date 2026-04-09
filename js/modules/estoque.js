import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 🔥 controle de edição
let modoEdicaoProduto = null

export function initEstoque() {
  const tabela = document.getElementById('tabelaEstoque')
  const busca = document.getElementById('busca')
  let timeout = null

  // =========================
  // BUSCAR / LISTAR
  // =========================
  async function buscar() {
    const termo = busca?.value?.trim() || ''

    let query = supabase.from('produtos').select('*').order('nome', { ascending: true })

    if (termo) {
      query = query.or(
        `codigo.ilike.%${termo}%,nome.ilike.%${termo}%,endereco_externo.ilike.%${termo}%,endereco_satelite.ilike.%${termo}%,liberacao.ilike.%${termo}%,observacao.ilike.%${termo}%`
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
      // <td>${item.codigo_mv || ''}</td>
      // <td>${item.codigo_sga || ''}</td>
      <td>${item.codigo || ''}</td>
      

      <td>
        <div style="font-weight: bold;">
          ${item.nome || ''}
        </div>

        <div style="font-size: 12px; color: #666;">
          ${item.liberacao || '-'} | ${item.observacao || '-'}
        </div>
      </td>

      <td>${item.endereco_externo || ''}</td>
      <td>${item.endereco_satelite || ''}</td>
      
      <td>
        <div class="acoes">
          <button class="btn-menu" onclick="toggleMenu(this)">⋮</button>
          <div class="menu-acoes hidden">
            <button onclick="editarProduto('${item.id}')">Editar</button>
            <button onclick="clonarItem('${item.id}')">Clonar</button>
            <button onclick="excluirProduto('${item.id}')">Excluir</button>
          </div>
        </div>
      </td>
    </tr>`
  })

  tabela.innerHTML = linhas
}

  function atualizarContador(qtd) {
    const contador = document.getElementById("contadorEstoque")
    if (contador) {
      contador.innerText = "Itens: " + qtd
    }
  }

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

  // primeira carga
  buscar()

  window.atualizarEstoque = buscar
}

// =========================
// CRUD PRODUTO
// =========================

async function salvarProduto() {
  const codigo = document.getElementById("codigo").value
  const nome = document.getElementById("nome").value
  const externo = document.getElementById("externo").value
  const satelite = document.getElementById("satelite").value
  const observacao = document.getElementById("observacao").value
  const liberacao = document.getElementById("liberacao").value

  if (!codigo || !nome) {
    showToast("Preencha código e nome")
    return
  }

  if (modoEdicaoProduto) {
    const { error } = await supabase.from('produtos').update({
      codigo,
      nome,
      endereco_externo: externo,
      endereco_satelite: satelite,
      observacao,
      liberacao
    }).eq('id', modoEdicaoProduto)

    if (error) {
      showToast("Erro ao atualizar")
      return
    }

    showToast("Item atualizado")
    modoEdicaoProduto = null

  } else {
    const { error } = await supabase.from('produtos').insert({
      codigo,
      nome,
      endereco_externo: externo,
      endereco_satelite: satelite,
      observacao,
      liberacao
    })

    if (error) {
      showToast("Erro ao salvar")
      return
    }

    showToast("Item cadastrado")
  }

  window.atualizarEstoque?.()
  fecharModal()
  limparCampos()
}

async function editarProduto(id) {
  modoEdicaoProduto = id

  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    showToast("Item não encontrado")
    return
  }

  document.getElementById("codigo").value = data.codigo
  document.getElementById("nome").value = data.nome
  document.getElementById("externo").value = data.endereco_externo
  document.getElementById("satelite").value = data.endereco_satelite
  document.getElementById("observacao").value = data.observacao || ''
  document.getElementById("liberacao").value = data.liberacao || ''

  abrirModal()
}

async function excluirProduto(id) {
  const { error } = await supabase.from('produtos').delete().eq('id', id)

  if (error) {
    showToast("Erro ao excluir")
  } else {
    showToast("Item excluído")
    window.atualizarEstoque?.()
  }
}

async function clonarItem(id) {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    showToast("Erro ao clonar")
    return
  }

  const clone = { ...data }
  delete clone.id

  const { error: insertError } = await supabase.from('produtos').insert(clone)

  if (insertError) {
    showToast("Erro ao salvar clone")
  } else {
    showToast("Item clonado")
    window.atualizarEstoque?.()
  }
}

// =========================
// UI
// =========================

function abrirModal() {
  document.getElementById("modal").classList.remove("hidden")
}

function fecharModal() {
  document.getElementById("modal").classList.add("hidden")
}

function limparCampos() {
  document.querySelectorAll("#modal input").forEach(i => i.value = "")
}

// =========================
// UTIL
// =========================

function showToast(msg) {
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
// GLOBAL
// =========================
window.editarProduto = editarProduto
window.excluirProduto = excluirProduto
window.clonarItem = clonarItem