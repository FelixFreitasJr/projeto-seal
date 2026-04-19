import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let graficoPizza = null
let graficoEquipes = null
let graficoDia = null

const EQUIPES = ['Equipe A', 'Equipe B', 'Equipe C', 'Equipe D']
const DATA_BASE_CICLO = new Date('2025-01-01T00:00:00-03:00')

function destruirGraficos() {
  if (graficoPizza) {
    graficoPizza.destroy()
    graficoPizza = null
  }
  if (graficoEquipes) {
    graficoEquipes.destroy()
    graficoEquipes = null
  }
  if (graficoDia) {
    graficoDia.destroy()
    graficoDia = null
  }
}

function converterParaSaoPaulo(dataISO) {
  return new Date(new Date(dataISO).toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
}

function calcularEquipe(dataISO) {
  const dataDispensa = converterParaSaoPaulo(dataISO)
  const diferencaMs = dataDispensa.getTime() - DATA_BASE_CICLO.getTime()
  const diasCiclo = Math.floor(diferencaMs / (1000 * 60 * 60 * 24))
  const indiceEquipe = ((diasCiclo % EQUIPES.length) + EQUIPES.length) % EQUIPES.length
  return EQUIPES[indiceEquipe]
}

function getDatasUltimosDias(quantidade) {
  const hoje = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const datas = []

  for (let i = quantidade - 1; i >= 0; i--) {
    const data = new Date(hoje)
    data.setDate(hoje.getDate() - i)
    datas.push(data)
  }

  return datas
}

export async function carregarGraficos() {
  destruirGraficos()

  const inicio = document.getElementById('dataInicio')?.value
  const fim = document.getElementById('dataFim')?.value

  let query = supabase.from('dispensas').select('*')
  if (inicio) query = query.gte('data_hora', `${inicio}T00:00:00`)
  if (fim) query = query.lte('data_hora', `${fim}T23:59:59`)

  const { data, error } = await query
  if (error || !data) return

  // 📊 Pizza (Local)
  const mapaLocal = { ADM: 0, EXTERNO: 0, SATELITE: 0 }
  data.forEach((d) => {
    if (mapaLocal[d.usuario] !== undefined) mapaLocal[d.usuario]++
  })

  graficoPizza = new Chart(document.getElementById('graficoPizza'), {
    type: 'pie',
    data: {
      labels: Object.keys(mapaLocal),
      datasets: [{
        data: Object.values(mapaLocal),
        backgroundColor: ['#4CAF50', '#2196F3', '#FF9800']
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom' }
      },
      onClick: (_, elements) => {
        if (!elements.length) return

        const indice = elements[0].index
        const local = graficoPizza.data.labels[indice]

        if (window.abrirModalDispensadosPorLocal) {
          window.abrirModalDispensadosPorLocal(local)
          return
        }

        if (window.abrirModalDispensados) {
          window.abrirModalDispensados(local)
        }
      }
    }
  })

  // 📊 Barra (Dispensas por equipe no ciclo 4x)
  const mapaEquipes = {
    'Equipe A': 0,
    'Equipe B': 0,
    'Equipe C': 0,
    'Equipe D': 0
  }

  data.forEach((d) => {
    const equipe = calcularEquipe(d.data_hora)
    mapaEquipes[equipe]++
  })

  graficoEquipes = new Chart(document.getElementById('graficoEquipes'), {
    type: 'bar',
    data: {
      labels: Object.keys(mapaEquipes),
      datasets: [{
        label: 'Dispensas por equipe',
        data: Object.values(mapaEquipes),
        backgroundColor: ['#8E24AA', '#00897B', '#F4511E', '#3949AB'],
        borderRadius: 8
      }]
    },
    options: {
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  })

  // 📊 Linha (Dispensas por dia - atividade recente)
  const datasUltimos7Dias = getDatasUltimosDias(7)
  const mapaDias = {}

  datasUltimos7Dias.forEach((dataDia) => {
    const chave = dataDia.toISOString().split('T')[0]
    mapaDias[chave] = 0
  })

  data.forEach((d) => {
    const dataSP = converterParaSaoPaulo(d.data_hora)
    const chave = dataSP.toISOString().split('T')[0]
    if (mapaDias[chave] !== undefined) mapaDias[chave]++
  })

  graficoDia = new Chart(document.getElementById('graficoDia'), {
    type: 'line',
    data: {
      labels: Object.keys(mapaDias).map((dia) => {
        const [ano, mes, diaMes] = dia.split('-')
        return `${diaMes}/${mes}`
      }),
      datasets: [{
        label: 'Dispensas no dia',
        data: Object.values(mapaDias),
        borderColor: '#E53935',
        backgroundColor: 'rgba(229, 57, 53, 0.15)',
        fill: true,
        tension: 0.25,
        pointRadius: 4
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom' }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  })
}

export function filtrarPeriodo(dias) {
  const hoje = new Date()
  const inicio = new Date()
  inicio.setDate(hoje.getDate() - dias)

  document.getElementById('dataInicio').value = inicio.toISOString().split('T')[0]
  document.getElementById('dataFim').value = hoje.toISOString().split('T')[0]

  carregarGraficos()
}

export function toggleFiltroPersonalizado() {
  document.getElementById('filtroCustom').classList.toggle('hidden')
}
