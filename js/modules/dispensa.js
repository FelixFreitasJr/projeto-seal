import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { getUser } from '../auth.js'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 🔥 controle de edição
let modoEdicaoColaborador = null

export function initDispensa() {
  const tabela = document.getElementById('tabela')
  const busca = document.getElementById('busca')
  if (!tabela || !busca) return

  const sessao = JSON.parse(localStorage.getItem('usuarioLogado') || '{}')
  const mostrarCpfCompleto = sessao?.perfil === 'ADM'

  let timeout = null

  // =========================
  // BUSCAR / LISTAR
  // =========================
  async function buscar() {
    const termo = busca.value.trim()

    if (!termo) {
      renderTabela([])
      return
    }

    let query = supabase.from('colaboradores').select('*').order('nome', { ascending: true })

    query = query.or(
      `cpf.ilike.%${termo}%,nome.ilike.%${termo}%,empresa.ilike.%${termo}%,funcao.ilike.%${termo}%`
    )

    const { data, error } = await query

    if (error) {
      console.error(error)
      return
    }

    renderTabela(data)
  }

  function renderTabela(data) {
    let linhas = ''

    data.forEach(item => {
      linhas += `
        <tr>
          <td class="col-cpf">${mostrarCpfCompleto ? item.cpf : mascararCPF(item.cpf)}</td>
          <td class="col-nome">${escapeHtml(item.nome)}</td>
          <td class="col-empresa">${escapeHtml(item.empresa)}</td>
          <td class="col-funcao">${escapeHtml(item.funcao)}</td>
          <td>
            <div class="acoes-dispensa">
              <button class="btn-dispensar" onclick="dispensarItem('${item.id}')">
                <img src="../img/salvar.svg" alt="Dispensar"> Dispensar
              </button>
              <button class="btn-editar" onclick="editarColaborador('${item.id}')">
                <img src="../img/editar.svg" alt="Editar"> Editar
              </button>
              <button class="btn-excluir" onclick="excluirItem('${item.id}')">
                <img src="../img/excluir.svg" alt="Excluir"> Excluir
              </button>
            </div>
          </td>
        </tr>`
    })

    tabela.innerHTML = linhas
  }

  // =========================
  // EVENTOS
  // =========================
  busca?.addEventListener('input', () => {
    clearTimeout(timeout)
    timeout = setTimeout(buscar, 300)
  })

  document.getElementById('limparBusca')?.addEventListener('click', () => {
    busca.value = ''
    buscar()
  })

  document.getElementById("btnNovoColaborador")?.addEventListener("click", () => {
    modoEdicaoColaborador = null
    limparCampos()
    abrirModal()
  })

  document.getElementById("btnCancelarColaborador")?.addEventListener("click", fecharModal)

  document.getElementById("btnSalvarColaborador")?.addEventListener("click", salvarColaborador)

  // expõe global
  window.atualizarDispensa = buscar

  // primeira carga: mantém a tabela vazia até o usuário pesquisar
  renderTabela([])
}

// =========================
// CRUD COLABORADOR
// =========================

async function salvarColaborador() {
  const cpf = limparCPF(document.getElementById("cpf").value)
  const nome = document.getElementById("nome").value.trim()
  const empresa = document.getElementById("empresa").value.trim()
  const funcao = document.getElementById("funcao").value.trim()

  if (!nome || !empresa || !funcao) {
    showToast("Preencha nome, empresa e função", "alerta")
    return
  }

  if (!validarCPF(cpf)) {
    showToast("CPF inválido", "erro")
    return
  }

  if (modoEdicaoColaborador) {
    const { error } = await supabase.from('colaboradores').update({
      cpf,
      nome: nome.toUpperCase(),
      empresa: empresa.toUpperCase(),
      funcao: funcao.toUpperCase()
    }).eq('id', modoEdicaoColaborador)

    if (error) {
      showToast("Erro ao atualizar", "erro")
      return
    }

    showToast("Colaborador atualizado", "sucesso")
    modoEdicaoColaborador = null

  } else {
    const { data: existente } = await supabase
      .from('colaboradores')
      .select('cpf')
      .eq('cpf', cpf)
      .maybeSingle()

    if (existente) {
      showToast("CPF já cadastrado", "alerta")
      return
    }

    const { error } = await supabase.from('colaboradores').insert({
      cpf,
      nome: nome.toUpperCase(),
      empresa: empresa.toUpperCase(),
      funcao: funcao.toUpperCase()
    })

    if (error) {
      showToast("Erro ao cadastrar", "erro")
      return
    }

    showToast("Colaborador cadastrado", "sucesso")
  }

  window.atualizarDispensa?.()
  fecharModal()
  limparCampos()
}

async function editarColaborador(id) {
  modoEdicaoColaborador = id

  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    showToast("Colaborador não localizado", "erro")
    return
  }

  document.getElementById("cpf").value = formatarCPF(data.cpf)
  document.getElementById("nome").value = data.nome
  document.getElementById("empresa").value = data.empresa
  document.getElementById("funcao").value = data.funcao

  abrirModal()
}

async function excluirItem(id) {
  const { error } = await supabase.from('colaboradores').delete().eq('id', id)

  if (error) {
    showToast("Erro ao excluir", "erro")
  } else {
    showToast("Excluído com sucesso", "sucesso")
    window.atualizarDispensa?.()
  }
}

async function dispensarItem(id) {
  const user = getUser()

  const { data: colab, error } = await supabase
    .from('colaboradores')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    showToast("Erro ao buscar colaborador", "erro")
    return
  }

  const { error: insertError } = await supabase.from('dispensas').insert({
    cpf: colab.cpf,
    nome: colab.nome,
    empresa: colab.empresa,
    funcao: colab.funcao,
    usuario: user,
    data_hora: new Date().toISOString()
  })

  if (insertError) {
    showToast("Erro ao dispensar", "erro")
  } else {
    showToast("Dispensa registrada", "sucesso")

    // limpa busca
    const busca = document.getElementById("busca")
    const tabela = document.getElementById("tabela")

    if (busca) busca.value = ""
    if (tabela) tabela.innerHTML = ""

    // foca no campo novamente
    busca?.focus()
  }
}

// =========================
// UI
// =========================

function abrirModal() {
  const tituloModal = document.querySelector("#modalColaborador h3")
  if (modoEdicaoColaborador) {
    tituloModal.innerText = "Atualizar Colaborador"
  } else {
    tituloModal.innerText = "Novo Colaborador"
  }
  document.getElementById("modalColaborador").classList.remove("hidden")
}

function fecharModal() {
  document.getElementById("modalColaborador").classList.add("hidden")
  modoEdicaoColaborador = null
}

function limparCampos() {
  document.querySelectorAll("#modalColaborador input").forEach(i => i.value = "")
}

// =========================
// UTIL
// =========================

function limparCPF(cpf) {
  return cpf.replace(/[^\d]/g, '')
}

function formatarCPF(cpf) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

function mascararCPF(cpf) {
  cpf = limparCPF(cpf)
  if (cpf.length !== 11) return cpf
  return cpf.substring(0, 3) + '.' + cpf.substring(3, 6) + '.XXX-' + cpf.substring(9, 11)
}

function validarCPF(cpf) {
  if (!cpf || cpf.length !== 11) return false
  if (/^(\d)\1+$/.test(cpf)) return false
  return true
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

// =========================
// GLOBAL
// =========================
window.editarColaborador = editarColaborador
window.excluirItem = excluirItem
window.dispensarItem = dispensarItem
