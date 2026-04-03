import { SUPABASE_URL, SUPABASE_KEY } from './config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let ordem = { campo: 'nome', asc: true }

// =========================
// UTIL
// =========================

function mostrarToast(msg) {
  const toast = document.getElementById('toast')
  if (!toast) return
  toast.innerText = msg
  toast.style.display = 'block'
  setTimeout(() => toast.style.display = 'none', 3000)
}

function limparFormulario() {
  document.getElementById('codigo').value = ''
  document.getElementById('nome').value = ''
  document.getElementById('externo').value = ''
  document.getElementById('satelite').value = ''
  document.getElementById('observacao').value = ''
  document.getElementById('liberacao').value = 'LIVRE'
}

// =========================
// INIT POR PÁGINA
// =========================

document.addEventListener('DOMContentLoaded', () => {

  const pagina = window.location.pathname

  if (pagina.includes('estoque.html')) {
    iniciarEstoque()
  }

  if (pagina.includes('dispensa.html')) {
    iniciarDispensa()
  }

})

// =========================
// ESTOQUE (SEU CÓDIGO)
// =========================

function iniciarEstoque() {

  const tabela = document.getElementById('tabela')
  const total = document.getElementById('totalItens')
  const modal = document.getElementById('modal')
  const inputBusca = document.getElementById('busca')
  const btnSalvar = document.getElementById('btnSalvar')
  const limparBusca = document.getElementById('limparBusca')

  let timeout = null

  async function buscar() {

    const termo = inputBusca.value.trim()

    let query = supabase.from('produtos').select('*')

    if (termo) {
      query = query.or(`codigo.ilike.%${termo}%,nome.ilike.%${termo}%,observacao.ilike.%${termo}%`)
    }

    query = query.order(ordem.campo, { ascending: ordem.asc })

    const { data, error } = await query

    if (error) {
      mostrarToast('Erro ao buscar')
      return
    }

    total.innerText = `${data.length} itens no estoque`

    let linhas = ''

    data.forEach(item => {

      let classeStatus = 'inativo'

      if (item.liberacao === 'LIVRE') classeStatus = 'livre'
      else if (item.liberacao === 'SOMENTE NO EXTERNO') classeStatus = 'externo'

      linhas += `
      <tr>
        <td>${item.codigo}</td>
        <td>${item.nome}</td>
        <td>${item.endereco_externo || '-'}</td>
        <td>${item.endereco_satelite || '-'}</td>

        <td>
          <div class="acoes">
            <button class="btn-menu" onclick="toggleMenu(this)">⋮</button>

            <div class="menu-acoes hidden">
              <button onclick="editarItem('${item.id}')">Editar</button>
              <button onclick="clonarItem('${item.id}')">Clonar</button>
              <button onclick="excluirItem('${item.id}')">Excluir</button>
            </div>
          </div>
        </td>
      </tr>
      `
    })

    tabela.innerHTML = linhas
  }

  document.getElementById('btnBuscar').addEventListener('click', buscar)

  inputBusca.addEventListener('input', () => {
    clearTimeout(timeout)
    timeout = setTimeout(buscar, 300)
  })

  limparBusca.addEventListener('click', () => {
    inputBusca.value = ''
    buscar()
  })

  document.getElementById('btnNovo').addEventListener('click', () => {
    limparFormulario()
    btnSalvar.dataset.id = ''
    modal.classList.remove('hidden')
  })

  document.getElementById('btnExportar').addEventListener('click', () => {
    window.print()
  })

  document.getElementById('btnCancelar').addEventListener('click', () => {
    limparFormulario()
    modal.classList.add('hidden')
  })

  btnSalvar.addEventListener('click', async () => {

    const codigo = document.getElementById('codigo').value.toUpperCase()
    const nome = document.getElementById('nome').value.toUpperCase()

    if (!codigo || !nome) {
      mostrarToast('Código e Nome obrigatórios')
      return
    }

    const id = btnSalvar.dataset.id

    const { data: existente } = await supabase
      .from('produtos')
      .select('id')
      .eq('codigo', codigo)
      .maybeSingle()

    if (existente && existente.id !== id) {
      mostrarToast('Código já existe')
      return
    }

    const dados = {
      codigo,
      nome,
      observacao: document.getElementById('observacao').value,
      endereco_externo: document.getElementById('externo').value,
      endereco_satelite: document.getElementById('satelite').value,
      liberacao: document.getElementById('liberacao').value
    }

    const resposta = id
      ? await supabase.from('produtos').update(dados).eq('id', id)
      : await supabase.from('produtos').insert([dados])

    if (resposta.error) {
      mostrarToast('Erro ao salvar')
      return
    }

    mostrarToast('Salvo com sucesso')
    limparFormulario()
    modal.classList.add('hidden')
    buscar()
  })

  buscar()
}

// =========================
// DISPENSA
// =========================

function iniciarDispensa() {

  const tabela = document.getElementById('tabela')
  const inputBusca = document.getElementById('busca')

  let timeout = null

  async function buscar() {

    const termo = inputBusca.value.trim()

    let query = supabase.from('colaboradores').select('*')

    if (termo) {
      query = query.or(`
        cpf.ilike.${termo}%,
        nome.ilike.%${termo}%,
        empresa.ilike.%${termo}%,
        funcao.ilike.%${termo}%
      `)
    }

    const { data, error } = await query

    if (error) {
      mostrarToast('Erro ao buscar')
      return
    }

    let linhas = ''

    data.forEach(p => {

      const cpfMascarado = p.cpf.slice(0,6) + '-XX'

      linhas += `
      <tr>
        <td>${cpfMascarado}</td>
        <td>${p.nome}</td>
        <td>${p.empresa}</td>
        <td>${p.funcao}</td>

        <td>
          <button onclick='dispensar(${JSON.stringify(p)})'>
            Dispensar
          </button>
        </td>
      </tr>
      `
    })

    tabela.innerHTML = linhas
  }

  inputBusca.addEventListener('input', () => {
    clearTimeout(timeout)
    timeout = setTimeout(buscar, 300)
  })

  buscar()
}

// =========================
// GLOBAIS
// =========================

window.dispensar = async function(pessoa) {

  const user = localStorage.getItem("user")

  const { error } = await supabase
    .from('dispensas')
    .insert([{
      cpf: pessoa.cpf,
      nome: pessoa.nome,
      empresa: pessoa.empresa,
      funcao: pessoa.funcao,
      usuario: user,
      data_hora: new Date()
    }])

  if (error) {
    mostrarToast('Erro ao dispensar')
    return
  }

  mostrarToast('Dispensado com sucesso')
}

window.ordenar = function(campo) {
  ordem.asc = ordem.campo === campo ? !ordem.asc : true
  ordem.campo = campo
  document.getElementById('btnBuscar')?.click()
}

window.editarItem = async function(id) {
  const { data } = await supabase.from('produtos').select('*').eq('id', id).single()

  document.getElementById('codigo').value = data.codigo
  document.getElementById('nome').value = data.nome
  document.getElementById('externo').value = data.endereco_externo
  document.getElementById('satelite').value = data.endereco_satelite
  document.getElementById('observacao').value = data.observacao
  document.getElementById('liberacao').value = data.liberacao

  document.getElementById('btnSalvar').dataset.id = id
  document.getElementById('modal').classList.remove('hidden')
}

window.excluirItem = async function(id) {
  if (!confirm('Deseja excluir?')) return
  await supabase.from('produtos').delete().eq('id', id)
  mostrarToast('Excluído')
  document.getElementById('btnBuscar')?.click()
}

window.clonarItem = async function(id) {
  const { data } = await supabase.from('produtos').select('*').eq('id', id).single()

  const novoItem = {
    codigo: data.codigo + '_COPIA',
    nome: data.nome + ' (CÓPIA)',
    observacao: data.observacao,
    endereco_externo: data.endereco_externo,
    endereco_satelite: data.endereco_satelite,
    liberacao: data.liberacao
  }

  await supabase.from('produtos').insert([novoItem])
  mostrarToast('Clonado')
  document.getElementById('btnBuscar')?.click()
}

window.toggleMenu = function(btn) {
  const menu = btn.nextElementSibling

  document.querySelectorAll('.menu-acoes').forEach(m => {
    if (m !== menu) m.classList.add('hidden')
  })

  menu.classList.toggle('hidden')
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.acoes')) {
    document.querySelectorAll('.menu-acoes').forEach(m => m.classList.add('hidden'))
  }
})