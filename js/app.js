import { SUPABASE_URL, SUPABASE_KEY } from './config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

document.addEventListener('DOMContentLoaded', () => {

  const tabela = document.getElementById('tabela')
  const total = document.getElementById('totalItens')
  const modal = document.getElementById('modal')
  const inputBusca = document.getElementById('busca')
  const btnSalvar = document.getElementById('btnSalvar')

  let timeout = null

  // =========================
  // BUSCAR
  // =========================
  async function buscar() {
    const termo = inputBusca.value.trim()

    tabela.innerHTML = ''

    let query = supabase
      .from('produtos')
      .select('*')

    if (termo) {
      query = query.or(`codigo.ilike.%${termo}%,nome.ilike.%${termo}%,observacao.ilike.%${termo}%`)
    }

    query = query.order('nome', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error(error)
      alert('Erro ao buscar dados')
      return
    }

    if (!data || data.length === 0) {
      tabela.innerHTML = '<tr><td colspan="6">Nenhum resultado encontrado</td></tr>'
      total.innerText = '0 itens no estoque'
      return
    }

    total.innerText = `${data.length} itens no estoque`

    let linhas = ''

    data.forEach(item => {
      let classeStatus = ''

      if (item.liberacao === 'LIVRE') classeStatus = 'livre'
      else if (item.liberacao === 'SOMENTE NO EXTERNO') classeStatus = 'externo'
      else classeStatus = 'inativo'

      linhas += `
        <tr>
          <td>${item.codigo}</td>
          <td>
            ${item.nome}
            <div class="obs">${item.observacao || ''}</div>
          </td>
          <td>${item.endereco_externo || '-'}</td>
          <td>${item.endereco_satelite || '-'}</td>
          <td><span class="status ${classeStatus}">${item.liberacao || '-'}</span></td>
          <td>
            <button onclick="editarItem('${item.id}')">✏️</button>
            <button onclick="excluirItem('${item.id}')" style="margin-left:5px;">🗑️</button>
            <button onclick="clonarItem('${item.id}')" style="margin-left:5px;">📄</button>
          </td>
        </tr>
      `
    })

    tabela.innerHTML = linhas
  }

  // =========================
  // EVENTOS
  // =========================

  document.getElementById('btnBuscar').addEventListener('click', buscar)

  inputBusca.addEventListener('input', () => {
    clearTimeout(timeout)
    timeout = setTimeout(buscar, 300)
  })

  document.getElementById('btnNovo').addEventListener('click', () => {
    btnSalvar.dataset.id = ''
    modal.classList.remove('hidden')
  })

  document.getElementById('btnCancelar').addEventListener('click', () => {
    modal.classList.add('hidden')
  })

  // =========================
  // SALVAR (INSERT / UPDATE)
  // =========================
  btnSalvar.addEventListener('click', async () => {

    const codigo = document.getElementById('codigo').value.toUpperCase()
    const nome = document.getElementById('nome').value.toUpperCase()
    const externo = document.getElementById('externo').value.toUpperCase()
    const satelite = document.getElementById('satelite').value.toUpperCase()
    const observacao = document.getElementById('observacao').value.toUpperCase()
    const liberacao = document.getElementById('liberacao').value

    if (!codigo || !nome) {
      alert('Código e Nome são obrigatórios')
      return
    }

    const { data: existente } = await supabase
      .from('produtos')
      .select('id')
      .eq('codigo', codigo)
      .maybeSingle()

    if (existente && existente.id !== id) {
      alert('Já existe um item com esse código')
      return
    }

    const id = btnSalvar.dataset.id

    let response

    if (id) {
      response = await supabase
        .from('produtos')
        .update({
          codigo,
          nome,
          observacao,
          endereco_externo: externo,
          endereco_satelite: satelite,
          liberacao
        })
        .eq('id', id)
    } else {
      response = await supabase
        .from('produtos')
        .insert([{
          codigo,
          nome,
          observacao,
          endereco_externo: externo,
          endereco_satelite: satelite,
          liberacao
        }])
    }

    const { error } = response

    if (error) {
      console.error(error)
      alert('Erro ao salvar')
      return
    }

    alert(id ? 'Item atualizado com sucesso' : 'Item cadastrado com sucesso')

    modal.classList.add('hidden')

    // limpar campos
    document.getElementById('codigo').value = ''
    document.getElementById('nome').value = ''
    document.getElementById('externo').value = ''
    document.getElementById('satelite').value = ''
    document.getElementById('observacao').value = ''

    btnSalvar.dataset.id = ''

    buscar()
  })

  // carregar ao abrir
  buscar()
})


// =========================
// EDITAR ITEM (GLOBAL)
// =========================
window.editarItem = async function(id) {

  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error(error)
    alert('Erro ao carregar item')
    return
  }

  document.getElementById('codigo').value = data.codigo
  document.getElementById('nome').value = data.nome
  document.getElementById('externo').value = data.endereco_externo
  document.getElementById('satelite').value = data.endereco_satelite
  document.getElementById('observacao').value = data.observacao
  document.getElementById('liberacao').value = data.liberacao

  document.getElementById('btnSalvar').dataset.id = id

  document.getElementById('modal').classList.remove('hidden')
}


// =========================
// EXCLUIR ITEM (GLOBAL)
// =========================
window.excluirItem = async function(id) {

  const confirmar = confirm('Deseja realmente excluir este item?')
  if (!confirmar) return

  const { error } = await supabase
    .from('produtos')
    .delete()
    .eq('id', id)

  if (error) {
    console.error(error)
    alert('Erro ao excluir item')
    return
  }

  alert('Item excluído com sucesso')

  document.querySelector('#btnBuscar').click()
}


// =========================
// CLONAR ITEM (GLOBAL)
// =========================
window.clonarItem = async function(id) {

  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error(error)
    alert('Erro ao clonar item')
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
    alert('Erro ao clonar item')
    return
  }

  alert('Item clonado com sucesso')

  document.querySelector('#btnBuscar').click()
}