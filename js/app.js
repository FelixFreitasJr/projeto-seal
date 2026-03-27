import { SUPABASE_URL, SUPABASE_KEY } from './config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let ordem = { campo: 'nome', asc: true }

function mostrarToast(msg) {
  const toast = document.getElementById('toast')
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

document.addEventListener('DOMContentLoaded', () => {

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
    else classeStatus = 'inativo'

      linhas += `
      <tr>
        <td data-label="Código">${item.codigo}</td>

        <td data-label="Nome">
          ${item.nome}
          <div class="info-extra">
            <span class="status ${classeStatus}">
              ${item.liberacao || '-'}
            </span>

            ${item.observacao ? `
              <span class="separador">|</span>
              <span class="obs">${item.observacao}</span>
            ` : ''}
          </div>
        </td>

        <td data-label="Externo">${item.endereco_externo || '-'}</td>
        <td data-label="Satélite">${item.endereco_satelite || '-'}</td>

        <td data-label="Ações">
          <div class="acoes">
            <button class="btn-menu" onclick="toggleMenu(this)">⋮</button>

            <div class="menu-acoes hidden">
              <button onclick="editarItem('${item.id}')">
                <img src="img/editar.svg"> Editar
              </button>
              <button onclick="clonarItem('${item.id}')">
                <img src="img/clonar.svg"> Clonar
              </button>
              <button onclick="excluirItem('${item.id}')">
                <img src="img/excluir.svg"> Excluir
              </button>
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

})

// =========================
// FUNÇÕES GLOBAIS
// =========================

window.ordenar = function(campo) {
  ordem.asc = ordem.campo === campo ? !ordem.asc : true
  ordem.campo = campo
  document.getElementById('btnBuscar').click()
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
  if (!confirm('⚠️ Deseja realmente excluir este item?')) return
  await supabase.from('produtos').delete().eq('id', id)
  mostrarToast('Excluído')
  document.getElementById('btnBuscar').click()
}

window.clonarItem = async function(id) {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    mostrarToast('Erro ao clonar')
    return
  }

  const novoItem = {
    codigo: data.codigo + '_COPIA',
    nome: data.nome + ' (CÓPIA)',
    observacao: data.observacao,
    endereco_externo: data.endereco_externo,
    endereco_satelite: data.endereco_satelite,
    liberacao: data.liberacao
  }

  const { error: erroInsert } = await supabase
    .from('produtos')
    .insert([novoItem])

  if (erroInsert) {
    console.error(erroInsert)
    mostrarToast('Erro ao clonar')
    return
  }

  mostrarToast('Item clonado com sucesso')
  document.getElementById('btnBuscar').click()
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

