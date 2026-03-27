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

    total.innerText = `${data.length} itens`

    let linhas = ''

    data.forEach(item => {

      let classeStatus =
        item.liberacao === 'LIVRE' ? 'livre' :
        item.liberacao === 'SOMENTE NO EXTERNO' ? 'externo' : 'inativo'

      linhas += `
        <tr>
          <td>${item.codigo}</td>

          <td>
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

          <td>${item.endereco_externo || '-'}</td>
          <td>${item.endereco_satelite || '-'}</td>

          <td>
            <div class="acoes">
              <button class="btn-menu" onclick="toggleMenu(this)">
                ⋮
              </button>

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
    btnSalvar.dataset.id = ''
    modal.classList.remove('hidden')
  })

  document.getElementById('btnCancelar').addEventListener('click', () => {
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
  if (!confirm('Excluir item?')) return
  await supabase.from('produtos').delete().eq('id', id)
  mostrarToast('Excluído')
  document.getElementById('btnBuscar').click()
}

window.clonarItem = async function(id) {
  const { data } = await supabase.from('produtos').select('*').eq('id', id).single()

  await supabase.from('produtos').insert([{
    ...data,
    id: undefined,
    codigo: data.codigo + '_COPIA',
    nome: data.nome + ' (CÓPIA)'
  }])

  mostrarToast('Clonado')
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