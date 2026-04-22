import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let graficoPizza = null
let graficoEquipes = null
let graficoDia = null


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

function obterPartesDataSP(dataISO) {
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false
  }).formatToParts(new Date(dataISO))

  const mapa = Object.fromEntries(partes.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]))
  return {
    ano: Number(mapa.year),
    mes: Number(mapa.month),
    dia: Number(mapa.day),
    hora: Number(mapa.hour)
  }
}

function obterChaveDataSP(dataISO) {
  const { ano, mes, dia } = obterPartesDataSP(dataISO)
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

function calcularEquipe(dataISO) {
  const partes = obterPartesDataSP(dataISO)
  const plantaoDiurno = partes.hora >= 7 && partes.hora < 19

  let diaReferencia = partes.dia

  if (!plantaoDiurno && partes.hora < 7) {
    const dataAnterior = new Date(Date.UTC(partes.ano, partes.mes - 1, partes.dia))
    dataAnterior.setUTCDate(dataAnterior.getUTCDate() - 1)
    diaReferencia = dataAnterior.getUTCDate()
  }

  const diaPar = diaReferencia % 2 === 0

  if (plantaoDiurno) return diaPar ? 'Plantão C' : 'Plantão A'
  return diaPar ? 'Plantão D' : 'Plantão B'
}

function getDatasUltimosDias(quantidade) {
  const agora = new Date()
  const datas = []

  for (let i = quantidade - 1; i >= 0; i--) {
    const data = new Date(agora)
    data.setDate(agora.getDate() - i)
    datas.push(obterChaveDataSP(data.toISOString()))
  }

  return datas
}


function formatarDataInput(data) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

async function buscarDispensasPaginadas(inicio, fim) {
  const limitePagina = 1000
  let pagina = 0
  let resultado = []

  while (true) {
    let query = supabase.from('dispensas').select('*')

    if (inicio) query = query.gte('data_hora', `${inicio}T00:00:00`)
    if (fim) query = query.lte('data_hora', `${fim}T23:59:59`)

    const from = pagina * limitePagina
    const to = from + limitePagina - 1

    const { data, error } = await query.range(from, to)
    if (error || !data) break

    resultado = resultado.concat(data)

    if (data.length < limitePagina) break
    pagina++
  }

  return resultado
}

export async function carregarGraficos() {
  destruirGraficos()

  const inicio = document.getElementById('dataInicio')?.value
  const fim = document.getElementById('dataFim')?.value

  const data = await buscarDispensasPaginadas(inicio, fim)
  if (!data.length) return

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
    'Plantão A': 0,
    'Plantão B': 0,
    'Plantão C': 0,
    'Plantão D': 0
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
      onClick: (_, elements) => {
        if (!elements.length) return
        const indice = elements[0].index
        const equipe = graficoEquipes.data.labels[indice]
        window.abrirModalDispensasPorEquipe?.(equipe)
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

  datasUltimos7Dias.forEach((chave) => {
    mapaDias[chave] = 0
  })

  data.forEach((d) => {
    const chave = obterChaveDataSP(d.data_hora)
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
      onClick: (_, elements) => {
        if (!elements.length) return
        const indice = elements[0].index
        const dataChave = datasUltimos7Dias[indice]
        window.abrirModalDispensasPorDia?.(dataChave)
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
  const inicio = new Date(hoje)
  inicio.setDate(hoje.getDate() - dias)

  document.getElementById('dataInicio').value = formatarDataInput(inicio)
  document.getElementById('dataFim').value = formatarDataInput(hoje)

  carregarGraficos()
}

export function toggleFiltroPersonalizado() {
  document.getElementById('filtroCustom').classList.toggle('hidden')
}
