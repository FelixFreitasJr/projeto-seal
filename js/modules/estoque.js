import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export function initEstoque() {

  const tabela = document.getElementById('tabela')
  const busca = document.getElementById('busca')

  let timeout = null

  async function buscar() {

    const termo = busca.value.trim()

    let query = supabase.from('produtos').select('*')

    if (termo) {
      query = query.or(`codigo.ilike.%${termo}%,nome.ilike.%${termo}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error(error)
      return
    }

    let linhas = ''

    data.forEach(item => {

      let statusClasse = 'inativo'

      if (item.liberacao === 'LIVRE') statusClasse = 'livre'
      else if (item.liberacao === 'SOMENTE NO EXTERNO') statusClasse = 'externo'

      linhas += `
      <tr>
        <td>${item.codigo}</td>

        <td>
          ${item.nome}

          <div class="info-extra">
            <span class="status ${statusClasse}">
              ${item.liberacao || ''}
            </span>

            ${item.observacao ? `<span class="separador">|</span>` : ''}

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

  busca.addEventListener('input', () => {
    clearTimeout(timeout)
    timeout = setTimeout(buscar, 300)
  })

  buscar()
}

document.getElementById('limparBusca')?.addEventListener('click', () => {
  busca.value = ''
  tabela.innerHTML = ''
})