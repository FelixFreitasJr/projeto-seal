import { SUPABASE_URL, SUPABASE_KEY } from './config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// conexão com Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// função de busca
async function buscar() {
  const termo = document.getElementById('busca').value
  document.getElementById('totalItens').innerText = `${data.length} itens encontrados`

  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .or(`codigo.ilike.%${termo}%,nome.ilike.%${termo}%`)

  // tratamento de erro
  if (error) {
    console.error(error)
    alert('Erro ao buscar dados')
    return
  }

  const tabela = document.getElementById('tabela')
  tabela.innerHTML = ''

  // caso não tenha resultado
  if (!data || data.length === 0) {
    tabela.innerHTML = '<tr><td colspan="5">Nenhum resultado encontrado</td></tr>'
document.getElementById('totalItens').innerText = '0 itens encontrados'
    return
  }

  // montagem das linhas
  let linhas = ''

  data.forEach(item => {
    let classeStatus = ''

    if (item.liberacao === 'LIVRE') classeStatus = 'livre'
    else if (item.liberacao === 'SOMENTE NO EXTERNO') classeStatus = 'externo'
    else classeStatus = 'inativo'

    linhas += `
      <tr>
        <td>${item.codigo}</td>
        <td>${item.nome}</td>
        <td>${item.endereco_externo || '-'}</td>
        <td>${item.endereco_satelite || '-'}</td>
        <td><span class="status ${classeStatus}">${item.liberacao || '-'}</span></td>
      </tr>
    `
  })

  tabela.innerHTML = linhas
}

// evento do botão
document.getElementById('btnBuscar').addEventListener('click', buscar)