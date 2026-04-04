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
      // busca por CPF, nome, empresa ou função
      query = query.or(
        `cpf.ilike.%${termo}%,nome.ilike.%${termo}%,empresa.ilike.%${termo}%,funcao.ilike.%${termo}%`
      )
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
        <td>${mascararCPF(item.cpf)}</td>
        <td>${item.nome}</td>
        <td>${item.empresa}</td>
        <td>${item.funcao}</td>
        <td>
          <div class="acoes">
            <button class="btn-menu" onclick="toggleMenu(this)">⋮</button>
            <div class="menu-acoes hidden">
              <button onclick="dispensarItem('${item.id}')">Dispensar</button>
              <button onclick="editarColaborador('${item.id}')">Editar</button>
              <button onclick="excluirItem('${item.id}')">Excluir</button>
            </div>
          </div>
        </td>
      </tr>`
    })

    tabela.innerHTML = linhas
  }

  // busca automática ao digitar
  busca.addEventListener('input', () => {
    clearTimeout(timeout)
    timeout = setTimeout(buscar, 300)
  })

  // limpar busca
  document.getElementById('limparBusca')?.addEventListener('click', () => {
    busca.value = ''
    tabela.innerHTML = ''
  })

  // expõe função para atualizar lista após ações
  window.atualizarDispensa = buscar
}

// Função para mascarar CPF
function mascararCPF(cpf) {
  cpf = cpf.replace(/[^\d]/g, '')
  if (cpf.length !== 11) return cpf
  return (
    cpf.substring(0, 3) +
    '.' +
    cpf.substring(3, 6) +
    '.' +
    'XXX' +
    '-' +
    cpf.substring(9, 11)
  )
}
