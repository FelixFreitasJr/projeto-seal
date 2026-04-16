import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let graficoPizza = null
let graficoBarra = null

function destruirGraficos() {
  if (graficoPizza) {
    graficoPizza.destroy()
    graficoPizza = null
  }
  if (graficoBarra) {
    graficoBarra.destroy()
    graficoBarra = null
  }
}

export async function carregarGraficos() {
  destruirGraficos()

  const inicio = document.getElementById("dataInicio")?.value
  const fim = document.getElementById("dataFim")?.value

  let query = supabase.from('dispensas').select('*')
  if (inicio) query = query.gte('data_hora', `${inicio}T00:00:00`)
  if (fim) query = query.lte('data_hora', `${fim}T23:59:59`)

  const { data, error } = await query
  if (error || !data) return

  // 📊 Pizza (Local)
  const mapaLocal = { ADM: 0, EXTERNO: 0, SATELITE: 0 }
  data.forEach(d => { if (mapaLocal[d.usuario] !== undefined) mapaLocal[d.usuario]++ })

  graficoPizza = new Chart(document.getElementById("graficoPizza"), {
    type: 'pie',
    data: {
      labels: Object.keys(mapaLocal),
      datasets: [{
        data: Object.values(mapaLocal),
        backgroundColor: ['#4CAF50', '#2196F3', '#FF9800']
      }]
    }
  })

  // 📊 Barra (Mês a mês)
  const mapaMes = {}
  data.forEach(d => {
    const dataObj = new Date(new Date(d.data_hora).toLocaleString('en-US', { timeZone:'America/Sao_Paulo' }))
    const chave = `${dataObj.getFullYear()}-${dataObj.getMonth()}`
    if (!mapaMes[chave]) {
      mapaMes[chave] = {
        label: dataObj.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }),
        total: 0
      }
    }
    mapaMes[chave].total++
  })

  const mesesOrdenados = Object.entries(mapaMes)
    .sort((a, b) => {
      const [anoA, mesA] = a[0].split('-').map(Number)
      const [anoB, mesB] = b[0].split('-').map(Number)
      return new Date(anoA, mesA) - new Date(anoB, mesB)
    })
    .map(item => item[1])

  graficoBarra = new Chart(document.getElementById("graficoBarra"), {
    type: 'bar',
    data: {
      labels: mesesOrdenados.map(m => m.label),
      datasets: [{
        label: 'Dispensas por mês',
        data: mesesOrdenados.map(m => m.total),
        backgroundColor: '#2196F3'
      }]
    }
  })
}

export function filtrarPeriodo(dias) {
  const hoje = new Date()
  const inicio = new Date()
  inicio.setDate(hoje.getDate() - dias)

  document.getElementById("dataInicio").value = inicio.toISOString().split('T')[0]
  document.getElementById("dataFim").value = hoje.toISOString().split('T')[0]

  carregarGraficos()
}

export function toggleFiltroPersonalizado() {
  document.getElementById("filtroCustom").classList.toggle("hidden")
}
