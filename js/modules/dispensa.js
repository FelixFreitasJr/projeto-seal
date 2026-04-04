import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export function initDispensa() {
  const tabela = document.getElementById('tabela')
  const busca = document.getElementById('busca')

  let timeout = null

  async function buscar() {
    const termo = busca.value.trim()
    let query = supabase.from('colaboradores').select('*')

    if (termo) {
      // busca pelos 6 primeiros dígitos do CPF, nome, empresa ou função
      query = query.or(`cpf.ilike.%${termo}%,nome.ilike.%${termo}%,empresa.ilike.%${termo}%,funcao.ilike.%${termo}%`)
    }

    const { data, error } = await query
    if (error) {
      console.error(error)
      return
    }

    let linhas = ''
    data.forEach(item => {
      linhas += `
      <tr>
        <td>${item.cpf}</td>
        <td>${item.nome}</td>
        <td>${item.empresa}</td>
        <td>${item.funcao}</td>
        <td>
          <div class="acoes">
            <button class="btn-menu" onclick="toggleMenu(this)">⋮</button>
            <div class="menu-acoes hidden">
              <button onclick="dispensarItem('${item.id}')">Dispensar</button>
              <button onclick="editarItem('${item.id}')">Editar</button>
              <button onclick="excluirItem('${item.id}')">Excluir</button>
            </div>
          </div>
        </td>
      </tr>`
    })

    tabela.innerHTML = linhas
  }

  busca.addEventListener('input', () => {
    clearTimeout(timeout)
    timeout = setTimeout(buscar, 300)
  })

  document.getElementById('limparBusca')?.addEventListener('click', () => {
    busca.value = ''
    tabela.innerHTML = ''
  })
}
