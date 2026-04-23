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
  const perfil = String(sessao?.perfil || '').toUpperCase()
  const perfisComGerenciamento = ['ADM', 'EXTERNO', 'SATELITE']
  const podeGerenciar = perfisComGerenciamento.includes(perfil)
  let colaboradoresCache = []

  let timeout = null

  // =========================
  // BUSCAR / LISTAR
  // =========================
  async function buscar() {
    const termoDigitado = busca.value.trim()
    const termo = termoDigitado.toUpperCase()
    const termoNumerico = limparCPF(termoDigitado)

    if (!termo) {
      renderTabela([])
      atualizarContador(0)
      return
    }

    const { data, error } = await supabase
      .from('colaboradores')
      .select('*')
      .or(`cpf.ilike.%${termoNumerico}%,nome.ilike.%${termo}%,empresa.ilike.%${termo}%,funcao.ilike.%${termo}%`)
      .order('nome', { ascending: true })


    if (error) {
      console.error(error)
      return
    }

    colaboradoresCache = data || []

    const filtrados = colaboradoresCache.filter((item) => {
      const cpf = String(item.cpf || '')
      const nome = String(item.nome || '').toUpperCase()
      const empresa = String(item.empresa || '').toUpperCase()
      const funcao = String(item.funcao || '').toUpperCase()
      return cpf.includes(termoNumerico) ||
        nome.includes(termo) ||
        empresa.includes(termo) ||
        funcao.includes(termo)
    })

    renderTabela(filtrados)
    atualizarContador(filtrados.length)
  }

  function renderTabela(data) {
    if (!data.length) {
      tabela.innerHTML = ''
      return
    }

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
              ${podeGerenciar ? `
              <button class="btn-editar" onclick="editarColaborador('${item.id}')">
                <img src="../img/editar.svg" alt="Editar"> Editar
              </button>
              <button class="btn-excluir" onclick="excluirItem('${item.id}')">
                <img src="../img/excluir.svg" alt="Excluir"> Excluir
              </button>` : ''}
            </div>
          </td>
        </tr>`
    })

    tabela.innerHTML = linhas
  }

  function atualizarContador(qtd) {
    const contador = document.getElementById("contadorColaboradores")
    if (contador) contador.innerText = `Colaboradores: ${qtd}`
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

  if (!podeGerenciar) {
    document.getElementById("btnNovoColaborador")?.classList.add('hidden')
  }

  carregarSugestoesColaborador()

  // expõe global
  window.atualizarDispensa = buscar

  // primeira carga
  buscar()
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

  window.atualizarDispensa()
  await carregarSugestoesColaborador()
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
  const confirmarExclusao = window.confirm('Tem certeza que deseja excluir este colaborador?')
  if (!confirmarExclusao) return

  const { error } = await supabase.from('colaboradores').delete().eq('id', id)

  if (error) {
    showToast("Erro ao excluir", "erro")
  } else {
    showToast("Excluído com sucesso", "sucesso")
    window.atualizarDispensa()
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

    // limpa tabela e contador
    renderTabela([])
    atualizarContador(0)

    // limpa campo de busca e foca novamente
    const busca = document.getElementById('busca')
    if (busca) {
      busca.value = ''
      busca.focus()
    }
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

async function carregarSugestoesColaborador() {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('empresa, funcao')
    .order('empresa', { ascending: true })

  if (error || !data) return

  preencherDatalist('sugestoesEmpresa', data.map(item => item.empresa))
  preencherDatalist('sugestoesFuncao', data.map(item => item.funcao))
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
