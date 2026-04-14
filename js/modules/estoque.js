import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 🔥 controle de edição
let modoEdicaoProduto = null

export function initEstoque() {
  const user = JSON.parse(localStorage.getItem("usuarioLogado"))
  const isAdmin = user?.perfil === "ADM"

  const tabela = document.getElementById('tabelaEstoque')
  const busca = document.getElementById('busca')
  let timeout = null

  if (!isAdmin) {
    document.getElementById("colAcoes").style.display = "none"
    document.getElementById("btnNovo").remove()
  }
   // =========================
  // BUSCAR / LISTAR
  // =========================
  async function buscar() {
    const termo = busca?.value?.trim() || ''

    let query = supabase.from('produtos').select('*').order('nome', { ascending: true })

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
        <div style="font-weight: bold;">
          ${escapeHtml(item.nome)}
        </div>

        <div class="status-container">
          <div class="status ${formatarStatusClasse(item.liberacao)}">
            ${escapeHtml(item.liberacao || '-')}
          </div>

          <div class="info-extra">
            | ${escapeHtml(item.observacao || '-')}
          </div>
        </div>
      </td>

      <td class="externo">${escapeHtml(item.endereco_externo)}</td>
      <td class="satelite">${escapeHtml(item.endereco_satelite)}</td>

        ${isAdmin ? `
        <td>
        <div class="acoes">
              <button onclick="editarProduto('${item.id}')"><img src="../img/editar.svg" alt="Editar"> Editar</button>
              <button onclick="clonarItem('${item.id}')"><img src="../img/clonar.svg" alt="Clonar"> Clonar</button>
              <button onclick="excluirProduto('${item.id}')"><img src="../img/excluir.svg" alt="Excluir"> Excluir</button>
        </div>
      </td>
      ` : ''}
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
  const codigo_mv = document.getElementById("codigo_mv").value
  const codigo_sga = document.getElementById("codigo_sga").value
  const nome = document.getElementById("nome").value
  const externo = document.getElementById("externo").value
  const satelite = document.getElementById("satelite").value
  const observacao = document.getElementById("observacao").value
  const liberacao = document.getElementById("liberacao").value

  if (!codigo_mv || !nome) {
    showToast("Preencha código MV e nome")
    return
  }

  if (modoEdicaoProduto) {
    const { error } = await supabase.from('produtos').update({
      codigo_mv,
      codigo_sga,
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
      codigo_mv,
      codigo_sga,
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

  document.getElementById("codigo_mv").value = data.codigo_mv
  document.getElementById("codigo_sga").value = data.codigo_sga
  document.getElementById("nome").value = data.nome
  document.getElementById("externo").value = data.endereco_externo
  document.getElementById("satelite").value = data.endereco_satelite
  document.getElementById("observacao").value = data.observacao || ''
  document.getElementById("liberacao").value = data.liberacao || 'LIVRE'

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
  const tituloModal = document.querySelector("#modal h3")
  if (modoEdicaoProduto) {
    tituloModal.innerText = "Atualizar Item"
  } else {
    tituloModal.innerText = "Novo Item"
  }
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

function toggleMenu(btn) {
  const menu = btn.nextElementSibling
  menu.classList.toggle("hidden")
}

window.toggleMenu = toggleMenu

// =========================
// GLOBAL
// =========================
window.editarProduto = editarProduto
window.excluirProduto = excluirProduto
window.clonarItem = clonarItem
window.formatarStatusClasse = formatarStatusClasse
