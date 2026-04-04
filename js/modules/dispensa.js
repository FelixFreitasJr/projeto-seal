import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export function initDispensa() {

  const tabela = document.getElementById('tabela')
  const busca = document.getElementById('busca')

  let timeout = null

  async function buscar() {

    const termo = busca.value.trim()

    if (!termo) {
      tabela.innerHTML = ''
      return
    }

    let query = supabase.from('colaboradores').select('*')

    query = query.or(
      `cpf.ilike.${termo}%,nome.ilike.%${termo}%`
    )

    const { data, error } = await query

    if (error) {
      console.error(error)
      return
    }

    let linhas = ''

    data.forEach(p => {

      const cpf = p.cpf.substring(0,6) + '-XX'

      linhas += `
      <tr>
        <td>${cpf}</td>
        <td>${p.nome}</td>
        <td>${p.empresa}</td>
        <td>${p.funcao}</td>

        <td>
          <div class="acoes">
            <button class="btn-menu" onclick="toggleMenu(this)">⋮</button>

            <div class="menu-acoes hidden">
              <button onclick="dispensar('${p.id}')">Dispensar</button>
              <button onclick="editarColaborador('${p.id}')">Editar</button>
              <button onclick="excluirColaborador('${p.id}')">Excluir</button>
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

}

// GLOBAL
window.dispensar = async function(id) {

  const user = localStorage.getItem("user") || 'externo'

  const { error } = await supabase
    .from('dispensas')
    .insert([{
      colaborador_id: id,
      usuario: user,
      data_hora: new Date()
    }])

  if (error) {
    alert('Erro ao dispensar')
    return
  }

  alert('Dispensado com sucesso')
}

document.getElementById('limparBusca')?.addEventListener('click', () => {
  busca.value = ''
  tabela.innerHTML = ''
})