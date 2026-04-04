import { initEstoque } from './modules/estoque.js'
import { initDispensa } from './modules/dispensa.js'
import { SUPABASE_URL, SUPABASE_KEY } from './config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

document.addEventListener('DOMContentLoaded', () => {
  const pagina = window.location.href

  if (pagina.endsWith("estoque.html")) {
    initEstoque()
    initEstoqueActions()
  }

  if (pagina.endsWith("dispensa.html")) {
    initDispensa()
  }
})

window.ir = function(pagina) {
  if (window.location.pathname.includes('/pages/')) {
    window.location.href = pagina
  } else {
    window.location.href = 'pages/' + pagina
  }
}

// =========================
// FUNÇÕES GLOBAIS
// =========================

// Editar item (estoque ou colaborador)
window.editarItem = async (id) => {
  alert("Função editar em desenvolvimento. ID: " + id)
}

// Clonar item (estoque)
window.clonarItem = async (id) => {
  const { data, error } = await supabase.from('produtos').select('*').eq('id', id).single()
  if (error) {
    alert("Erro ao clonar")
    return
  }
  const clone = { ...data, id: undefined }
  const { error: insertError } = await supabase.from('produtos').insert(clone)
  if (insertError) {
    alert("Erro ao salvar clone")
  } else {
    alert("Item clonado")
    location.reload()
  }
}

// Excluir item (estoque ou colaborador)
window.excluirItem = async (id) => {
  const tabela = window.location.href.endsWith("estoque.html") ? 'produtos' : 'colaboradores'
  const { error } = await supabase.from(tabela).delete().eq('id', id)
  if (error) {
    alert("Erro ao excluir")
  } else {
    alert("Item excluído")
    location.reload()
  }
}

// Dispensar colaborador
window.dispensarItem = async (id) => {
  const user = getUser()
  const { data: colaborador, error } = await supabase.from('colaboradores').select('*').eq('id', id).single()
  if (error) {
    alert("Erro ao buscar colaborador")
    return
  }

  const { error: insertError } = await supabase.from('dispensas').insert({
    cpf: colaborador.cpf,
    nome: colaborador.nome,
    empresa: colaborador.empresa,
    funcao: colaborador.funcao,
    usuario: user,
    datahora: new Date().toISOString()
  })

  if (insertError) {
    alert("Erro ao dispensar")
  } else {
    alert("Dispensa registrada")
  }
}

// Abrir/fechar menu de ações
window.toggleMenu = (btn) => {
  const menu = btn.nextElementSibling
  menu.classList.toggle("hidden")
}

// =========================
// ESTOQUE - NOVO ITEM
// =========================
function initEstoqueActions() {
  document.getElementById("btnNovo").addEventListener("click", () => {
    document.getElementById("modal").classList.remove("hidden")
  })

  document.getElementById("btnCancelar").addEventListener("click", () => {
    document.getElementById("modal").classList.add("hidden")
  })

  document.getElementById("btnSalvar").addEventListener("click", async () => {
    const codigo = document.getElementById("codigo").value
    const nome = document.getElementById("nome").value
    const externo = document.getElementById("externo").value
    const satelite = document.getElementById("satelite").value
    const observacao = document.getElementById("observacao").value
    const liberacao = document.getElementById("liberacao").value

    const { error } = await supabase.from('produtos').insert({
      codigo, nome, endereco_externo: externo, endereco_satelite: satelite,
      observacao, liberacao
    })

    if (error) {
      alert("Erro ao salvar")
    } else {
      alert("Item salvo")
      location.reload()
    }
  })
}

// =========================
// DISPENSA - NOVO COLABORADOR
// =========================
function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]+/g,'')
  if(cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false

  let soma = 0
  for (let i=0; i<9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i)
  let resto = 11 - (soma % 11)
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpf.charAt(9))) return false

  soma = 0
  for (let i=0; i<10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i)
  resto = 11 - (soma % 11)
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpf.charAt(10))) return false

  return true
}

function initDispensaActions() {
  document.getElementById("btnNovoColaborador").addEventListener("click", () => {
    document.getElementById("modalColaborador").classList.remove("hidden")
  })

  document.getElementById("btnCancelarColaborador").addEventListener("click", () => {
    document.getElementById("modalColaborador").classList.add("hidden")
  })

  document.getElementById("btnSalvarColaborador").addEventListener("click", async () => {
    const cpf = document.getElementById("cpf").value
    const nome = document.getElementById("nome").value
    const empresa = document.getElementById("empresa").value
    const funcao = document.getElementById("funcao").value

    if (!validarCPF(cpf)) {
      alert("CPF inválido")
      return
    }

    // Verifica duplicidade
    const { data: existente } = await supabase.from('colaboradores').select('cpf').eq('cpf', cpf).single()
    if (existente) {
      alert("Já existe colaborador com este CPF")
      return
    }

    const { error } = await supabase.from('colaboradores').insert({ cpf, nome, empresa, funcao })
    if (error) {
      alert("Erro ao salvar colaborador")
    } else {
      alert("Colaborador cadastrado")
      location.reload()
    }
  })
}

// Ativar junto com initDispensa
if (pagina.endsWith("dispensa.html")) {
  initDispensa()
  initDispensaActions()
}

