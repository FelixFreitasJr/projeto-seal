import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export function iniciarDispensa() {

  const tabela = document.getElementById('tabela')
  const inputBusca = document.getElementById('busca')

  let timeout = null

  function mostrarToast(msg) {
    const toast = document.getElementById('toast')
    if (!toast) return
    toast.innerText = msg
    toast.style.display = 'block'
    setTimeout(() => toast.style.display = 'none', 3000)
  }

  async function buscar() {

    const termo = inputBusca.value.trim()

    if (!termo) {
      tabela.innerHTML = ''
      return
    }

    let query = supabase.from('colaboradores').select('*')

    query = query.or(`
      cpf.ilike.${termo}%,
      nome.ilike.%${termo}%,
      empresa.ilike.%${termo}%
    `)

    const { data, error } = await query

    if (error) {
      mostrarToast('Erro')
      return
    }

    tabela.innerHTML = data.map(p => `
      <tr>
        <td>${p.cpf.substring(0,6)}-XX</td>
        <td>${p.nome}</td>
        <td>${p.empresa}</td>
        <td>${p.funcao}</td>
        <td>
          <button onclick="dispensar('${p.id}')">Dispensar</button>
        </td>
      </tr>
    `).join('')
  }

  inputBusca?.addEventListener('input', () => {
    clearTimeout(timeout)
    timeout = setTimeout(buscar, 300)
  })

  window.dispensar = async function(id) {

    const user = localStorage.getItem("user") || 'sem_login'

    const { error } = await supabase
      .from('dispensas')
      .insert([{
        colaborador_id: id,
        usuario: user,
        data_hora: new Date()
      }])

    if (error) {
      mostrarToast('Erro ao dispensar')
      return
    }

    mostrarToast('Dispensado')
  }
}