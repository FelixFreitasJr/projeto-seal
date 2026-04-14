import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { getUser } from '../auth.js'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 🔥 controle de edição
let modoEdicaoColaborador = null

export function initDispensa() {
  const tabela = document.getElementById('tabela')
  const busca = document.getElementById('busca')
  let timeout = null

  // =========================
  // BUSCAR / LISTAR
  // =========================
  async function buscar() {
    const termo = busca.value.trim()

    if (!termo) {
      tabela.innerHTML = ''
      return
    }

    let query = supabase.from('colaboradores').select('*').order('nome', { ascending: true })

    if (termo) {
      query = query.or(
        `cpf.ilike.%${termo}%,nome.ilike.%${termo}%,empresa.ilike.%${termo}%,funcao.ilike.%${termo}%`
      )
    }

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
        <td>${mascararCPF(item.cpf)}</td>
        <td>${item.nome}</td>
        <td>${item.empresa}</td>
        <td>${item.funcao}</td>
        <td>
          <div class="acoes">
              <button onclick="dispensarItem('${item.id}')">✔ Dispensar</button>
              <button onclick="editarColaborador('${item.id}')">📝 Editar</button>
              <button onclick="excluirItem('${item.id}')">🗑 Excluir</button>
            </div>
          </div>
        </td>
      </tr>`
    })

    tabela.innerHTML = linhas
  }

  // =========================
  // EVENTOS
  // =========================
  busca.addEventListener('input', () => {
    clearTimeout(timeout)
    timeout = setTimeout(buscar, 300)
  })

  document.getElementById('limparBusca')?.addEventListener('click', () => {
    busca.value = ''
    tabela.innerHTML = ''
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
}

// =========================
// CRUD COLABORADOR
// =========================

async function salvarColaborador() {
  const cpf = limparCPF(document.getElementById("cpf").value)
  const nome = document.getElementById("nome").value
  const empresa = document.getElementById("empresa").value
  const funcao = document.getElementById("funcao").value

  if (!validarCPF(cpf)) {
    showToast("CPF inválido")
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
      showToast("Erro ao atualizar")
      return
    }

    showToast("Colaborador atualizado")
    modoEdicaoColaborador = null

  } else {
    const { data: existente } = await supabase
      .from('colaboradores')
      .select('cpf')
      .eq('cpf', cpf)
      .maybeSingle()

    if (existente) {
      showToast("CPF já cadastrado")
      return
    }

    const { error } = await supabase.from('colaboradores').insert({
      cpf,
      nome: nome.toUpperCase(),
      empresa: empresa.toUpperCase(),
      funcao: funcao.toUpperCase()
    })

    if (error) {
      showToast("Erro ao cadastrar")
      return
    }

    showToast("Colaborador cadastrado")
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
    showToast("Colaborador não localizado")
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
    showToast("Erro ao excluir")
  } else {
    showToast("Excluído com sucesso")
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
    showToast("Erro ao buscar colaborador")
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
    showToast("Erro ao dispensar")
  } else {
    showToast("Dispensa registrada")

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
window.editarColaborador = editarColaborador
window.excluirItem = excluirItem
window.dispensarItem = dispensarItem
