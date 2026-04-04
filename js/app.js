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
    initDispensaActions()
  }

  // Ajusta título da página para incluir usuário logado
  const user = getUser()
  const titulo = document.querySelector(".titulo small")
  if (titulo && user) {
    titulo.innerText = titulo.innerText + " | Usuário: " + user
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

// EDITAR ITEM (estoque ou colaborador)
window.editarItem = async (id) => {
  const tabela = window.location.href.endsWith("estoque.html") ? 'produtos' : 'colaboradores'
  const { data, error } = await supabase.from(tabela).select('*').eq('id', id).single()
  if (error) {
    alert("Erro ao buscar item")
    return
  }

  if (tabela === 'produtos') {
    // Preenche modal de estoque
    document.getElementById("codigo").value = data.codigo
    document.getElementById("nome").value = data.nome
    document.getElementById("externo").value = data.endereco_externo
    document.getElementById("satelite").value = data.endereco_satelite
    document.getElementById("observacao").value = data.observacao
    document.getElementById("liberacao").value = data.liberacao
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
        alert("Erro ao atualizar")
      } else {
        alert("Item atualizado")
        location.reload()
      }
    }
  } else {
    // Preenche modal de colaborador
    document.getElementById("cpf").value = data.cpf
    document.getElementById("nome").value = data.nome
    document.getElementById("empresa").value = data.empresa
    document.getElementById("funcao").value = data.funcao
    document.getElementById("modalColaborador").classList.remove("hidden")

    document.getElementById("btnSalvarColaborador").onclick = async () => {
      const { error: updateError } = await supabase.from('colaboradores').update({
        cpf: document.getElementById("cpf").value,
        nome: document.getElementById("nome").value,
        empresa: document.getElementById("empresa").value,
        funcao: document.getElementById("funcao").value
      }).eq('id', id)

      if (updateError) {
        alert("Erro ao atualizar colaborador")
      } else {
        alert("Colaborador atualizado")
        location.reload()
      }
    }
  }
}

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

window.toggleMenu = (btn) => {
  const menu = btn.nextElementSibling
  menu.classList.toggle("hidden")
}

// Fecha menus ao clicar fora
document.addEventListener('click', (event) => {
  const menus = document.querySelectorAll('.menu-acoes')
  menus.forEach(menu => {
    if (!menu.contains(event.target) && !menu.previousElementSibling.contains(event.target)) {
      menu.classList.add('hidden')
    }
  })
})

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
  for (let i=0; i<9; iEntendido, Felix. Vou te entregar os dois arquivos **completos e corrigidos**, sem duplicação e sem cortes, prontos para substituir no projeto:

---

## 📂 auth.js

```js
function login() {
  const usuario = document.getElementById("usuario").value
  const senha = document.getElementById("senha").value

  if (
    (usuario === "EXTERNO" ||
     usuario === "SATELITE" ||
     usuario === "ADM") &&
    senha === "ALMOX"
  ) {
    localStorage.setItem("user", usuario)
    // Se login.html está dentro de /pages/, volta para raiz
    window.location.href = "../index.html"
  } else {
    alert("Usuário ou senha inválidos")
  }
}

function logout() {
  localStorage.removeItem("user")
  if (window.location.pathname.includes('/pages/')) {
    window.location.href = 'login.html'
  } else {
    window.location.href = 'pages/login.html'
  }
}

function checkAuth() {
  const user = localStorage.getItem("user")
  if (!user) {
    if (window.location.pathname.includes('/pages/')) {
      window.location.href = 'login.html'
    } else {
      window.location.href = 'pages/login.html'
    }
  }
}

function getUser() {
  return localStorage.getItem("user")
}
