import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let ordem = { campo: 'nome', asc: true }

export function iniciarEstoque() {

  const tabela = document.getElementById('tabela')
  const total = document.getElementById('totalItens')
  const modal = document.getElementById('modal')
  const inputBusca = document.getElementById('busca')
  const limparBusca = document.getElementById('limparBusca')
  const btnSalvar = document.getElementById('btnSalvar')

  let timeout = null

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

  async function buscar() {

    const termo = inputBusca.value.trim()

    let query = supabase.from('produtos').select('*')

    if (termo) {
      query = query.or(`codigo.ilike.%${termo}%,nome.ilike.%${termo}%`)
    }

    query = query.order(ordem.campo, { ascending: ordem.asc })

    const { data, error } = await query

    if (error) {
      mostrarToast('Erro ao buscar')
      return
    }

    total.innerText = `${data.length} itens no estoque`

    tabela.innerHTML = data.map(item => `
      <tr>
        <td>${item.codigo}</td>
        <td>
          ${item.nome}
          <div class="info-extra">
            <span class="status ${item.liberacao?.toLowerCase()}">${item.liberacao || ''}</span>
            ${item.observacao ? `<span class="obs">${item.observacao}</span>` : ''}
          </div>
        </td>
        <td>${item.endereco_externo || '-'}</td>
        <td>${item.endereco_satelite || '-'}</td>
        <td>
          <div class="acoes">
            <button class="btn-menu" onclick="toggleMenu(this)">⋮</button>
            <div class="menu-acoes hidden">
              <button onclick="editarItem('${item.id}')">Editar</button>
              <button onclick="excluirItem('${item.id}')">Excluir</button>
            </div>
          </div>
        </td>
      </tr>
    `).join('')
  }

  // EVENTOS

  document.getElementById('btnBuscar')?.addEventListener('click', buscar)

  inputBusca?.addEventListener('input', () => {
    clearTimeout(timeout)
    timeout = setTimeout(buscar, 300)
  })

  limparBusca?.addEventListener('click', () => {
    inputBusca.value = ''
    buscar()
  })

  document.getElementById('btnNovo')?.addEventListener('click', () => {
    limparFormulario()
    btnSalvar.dataset.id = ''
    modal.classList.remove('hidden')
  })

  document.getElementById('btnCancelar')?.addEventListener('click', () => {
    modal.classList.add('hidden')
  })

  btnSalvar?.addEventListener('click', async () => {

    const codigo = document.getElementById('codigo').value.toUpperCase()
    const nome = document.getElementById('nome').value.toUpperCase()

    if (!codigo || !nome) {
      mostrarToast('Preencha os campos')
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

    await supabase.from('produtos').insert([dados])

    mostrarToast('Salvo')
    modal.classList.add('hidden')
    buscar()
  })

  buscar()
}