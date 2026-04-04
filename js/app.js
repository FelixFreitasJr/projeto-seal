import { initEstoque } from './modules/estoque.js'
import { initDispensa } from './modules/dispensa.js'
import { SUPABASE_URL, SUPABASE_KEY } from './config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { getUser } from './auth.js'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

document.addEventListener('DOMContentLoaded', () => {
  const pagina = window.location.href

  if (pagina.endsWith("estoque.html")) {
    initEstoque()
    initEstoqueActions()
  }

  if (pagina.endsWith("dispensa.html")) {
    initDispensa()
    initDispensaActions()
  }

  // Ajusta título da página para incluir usuário logado
  const user = getUser()
  const titulo = document.querySelector(".titulo small")
  if (titulo && user) {
    titulo.innerText = titulo.innerText + " | Usuário: " + user
  }

  // Mostrar botão de config apenas para ADM
  if (user === "ADM") {
    document.getElementById("btnConfig").classList.remove("hidden")

    document.getElementById("btnConfig").addEventListener("click", async () => {
      const { data, error } = await supabase.from('usuarios').select('*')
      if (error) {
        alert("Erro ao carregar usuários")
        return
      }

      let linhas = ''
      data.forEach(u => {
        linhas += `
          <tr>
            <td>${u.usuario}</td>
            <td>${u.perfil}</td>
            <td>
              <button onclick="alterarSenha('${u.usuario}')">Alterar Senha</button>
            </td>
          </tr>`
      })
      document.getElementById("tabelaUsuarios").innerHTML = linhas
      document.getElementById("modalConfig").classList.remove("hidden")
    })

    document.getElementById("btnFecharConfig").addEventListener("click", () => {
      document.getElementById("modalConfig").classList.add("hidden")
    })
  }
})

// =========================
// FUNÇÕES GLOBAIS
// =========================

window.ir = function(pagina) {
  if (window.location.pathname.includes('/pages/')) {
    window.location.href = pagina
  } else {
    window.location.href = 'pages/' + pagina
  }
}

// Editar produto (estoque)
window.editarProduto = async (id) => {
  const { data, error } = await supabase.from('produtos').select('*').eq('id', id).single()
  if (error || !data) {
     showToast("Item não localizado")
    return
  }

  document.getElementById("codigo").value = data.codigo
  document.getElementById("nome").value = data.nome
  document.getElementById("externo").value = data.endereco_externo
  document.getElementById("satelite").value = data.endereco_satelite
  document.getElementById("observacao").value = data.observacao || ''
  document.getElementById("liberacao").value = data.liberacao || ''

  document.getElementById("modal").classList.remove("hidden")

  document.getElementById("btnSalvar").onclick = async () => {
    const { error: updateError } = await supabase.from('produtos').update({
      codigo: document.getElementById("codigo").value,
      nome: document.getElementById("nome").value,
      endereco_externo: document.getElementById("externo").value,
      endereco_satelite: document.getElementById("satelite").value,
      observacao: document.getElementById("observacao").value,
      liberacao: document.getElementById("liberacao").value
    }).eq('id', id)

    if (updateError) {
       showToast("Erro ao atualizar")
    } else {
       showToast("Item atualizado")
      window.atualizarEstoque?.()
      document.getElementById("modal").classList.add("hidden")
      limparCampos()
    }
  }
}

// Editar colaborador (dispensa)
window.editarColaborador = async (id) => {
  const { data, error } = await supabase.from('colaboradores').select('*').eq('id', id).single()
  if (error || !data) {
    showToast("Colaborador não localizado")
    return
  }

  document.getElementById("cpf").value = data.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  document.getElementById("nome").value = data.nome
  document.getElementById("empresa").value = data.empresa
  document.getElementById("funcao").value = data.funcao

  document.getElementById("modalColaborador").classList.remove("hidden")

  document.getElementById("btnSalvarColaborador").onclick = async () => {
    const cpfLimpo = limparCPF(document.getElementById("cpf").value)

    const { error: updateError } = await supabase.from('colaboradores').update({
      cpf: cpfLimpo,
      nome: document.getElementById("nome").value,
      empresa: document.getElementById("empresa").value,
      funcao: document.getElementById("funcao").value
    }).eq('id', id)

    if (updateError) {
      showToast("Erro ao atualizar colaborador")
    } else {
      showToast("Colaborador atualizado")
      window.atualizarDispensa?.()
      document.getElementById("modalColaborador").classList.add("hidden")
      limparCamposColaborador()
    }
  }
}


function limparCamposColaborador() {
  document.querySelectorAll("#modalColaborador input").forEach(i => i.value = "")
}


function limparCampos() {
  document.querySelectorAll("#modal input").forEach(i => i.value = "")
}


window.clonarItem = async (id) => {
  const { data, error } = await supabase.from('produtos').select('*').eq('id', id).single()
  if (error) {
     showToast("Erro ao clonar")
    return
  }
  const clone = { ...data, id: undefined }
  const { error: insertError } = await supabase.from('produtos').insert(clone)
  if (insertError) {
     showToast("Erro ao salvar clone")
  } else {
    showToast("Item clonado")
    window.atualizarEstoque?.()
  }
}

window.excluirItem = async (id) => {
  const tabela = window.location.href.endsWith("estoque.html") ? 'produtos' : 'colaboradores'
  const { error } = await supabase.from(tabela).delete().eq('id', id)
  if (error) {
     showToast("Erro ao excluir")
  } else {
     showToast("Item excluído")
    if (tabela === 'produtos') window.atualizarEstoque?.()
    else window.atualizarDispensa?.()
  }
}

window.dispensarItem = async (id) => {
  const user = getUser()
  const { data: colaborador, error } = await supabase.from('colaboradores').select('*').eq('id', id).single()
  if (error) {
     showToast("Erro ao buscar colaborador")
    return
  }

  const { error: insertError } = await supabase.from('dispensas').insert({
    cpf: colaborador.cpf,
    nome: colaborador.nome,
    empresa: colaborador.empresa,
    funcao: colaborador.funcao,
    usuario: user,
    data_hora: new Date().toISOString()
  })

  if (insertError) {
     showToast("Erro ao dispensar")
  } else {
     showToast("Dispensa registrada")
    window.atualizarDispensa?.()
  }
}

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
       showToast("Erro ao salvar")
    } else {
       showToast("Item salvo")
      window.atualizarEstoque?.()
      document.getElementById("modal").classList.add("hidden")
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
    const cpfLimpo = limparCPF(document.getElementById("cpf").value)
    const nome = document.getElementById("nome").value
    const empresa = document.getElementById("empresa").value
    const funcao = document.getElementById("funcao").value

    if (!validarCPF(cpf)) {
       showToast("CPF inválido")
      return
    }

    const { data: existente } = await supabase.from('colaboradores').select('cpf').eq('cpf', cpf).single()
    if (existente) {
       showToast("Já existe colaborador com este CPF")
      return
    }

    const { error } = await supabase.from('colaboradores').insert({ cpf, nome, empresa, funcao })
    if (error) {
       showToast("Erro ao salvar colaborador")
    } else {
       showToast("Colaborador cadastrado")
      window.atualizarDispensa?.()
      document.getElementById("modalColaborador").classList.add("hidden")
    }
  })
}

// =========================
// FECHAR MENUS AO CLICAR FORA
// =========================
document.addEventListener('click', (event) => {
  const menus = document.querySelectorAll('.menu-acoes')
  menus.forEach(menu => {
    if (!menu.contains(event.target) && !menu.previousElementSibling.contains(event.target)) {
      menu.classList.add('hidden')
    }
  })
})

// Função para alterar senha
window.alterarSenha = async (usuario) => {
  const novaSenha = prompt("Digite a nova senha para " + usuario)
  if (!novaSenha) return

  const { error } = await supabase.from('usuarios').update({ senha: novaSenha }).eq('usuario', usuario)
  if (error) {
     showToast("Erro ao alterar senha")
  } else {
     showToast("Senha atualizada com sucesso")
  }
}

// =========================
// FUNÇÕES AUXILIARES
// =========================
function limparCPF(cpf) {
  return cpf.replace(/[^\d]/g, '') // remove pontos e traço
}

function showToast(msg) {
  const toast = document.createElement("div")
  toast.className = "toast"
  toast.innerText = msg
  document.body.appendChild(toast)
  toast.style.display = "block"

  setTimeout(() => toast.classList.add("show"), 10)
  
  setTimeout(() => {
    toast.classList.remove("show")
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

window.ordenarTabela = async (tabela, campo) => {
  const { data, error } = await supabase.from(tabela).select('*').order(campo, { ascending: true })
  if (error) {
    showToast("Erro ao ordenar")
    return
  }
  if (tabela === 'produtos') {
    renderTabelaEstoque(data)
  } else {
    renderTabelaColaboradores(data)
  }
}

async function atualizarEstoque() {
  const { data, error } = await supabase.from('produtos').select('*')
  if (error) {
    showToast("Erro ao carregar estoque")
    return
  }
  document.getElementById("contadorEstoque").innerText = "Itens: " + data.length
  renderTabelaEstoque(data)
}

async function atualizarDispensa() {
  const { data, error } = await supabase.from('colaboradores').select('*')
  if (error) {
    showToast("Erro ao carregar colaboradores")
    return
  }
  document.getElementById("contadorColaboradores").innerText = "Colaboradores: " + data.length
  renderTabelaColaboradores(data)
}

async function carregarDashboard() {
  const { data: produtos } = await supabase.from('produtos').select('id')
  const { data: colaboradores } = await supabase.from('colaboradores').select('id')
  const { data: dispensas } = await supabase.from('dispensas').select('id')

  document.getElementById("totalProdutos").innerText = produtos.length
  document.getElementById("totalColaboradores").innerText = colaboradores.length
  document.getElementById("totalDispensas").innerText = dispensas.length
}

if (window.location.href.endsWith("index.html")) {
  carregarDashboard()
}

// document.getElementById("contadorEstoque").innerText = "Itens: " + data.length
// document.getElementById("contadorColaboradores").innerText = "Colaboradores: " + data.length

