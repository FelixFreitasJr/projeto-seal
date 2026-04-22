import { getUser } from '../auth.js'

const STORAGE_KEY_PREFIX = 'seal:table-columns'
const MIN_WIDTH = 60

function getStorageKey(table, indice) {
  const usuario = getUser() || 'anon'
  const tabelaId = table.id || table.dataset.resizeKey || window.location.pathname
  return `${STORAGE_KEY_PREFIX}:${usuario}:${tabelaId}:${indice}`
}

function aplicarLargurasSalvas(table) {
  const headers = table.querySelectorAll('thead th')
  headers.forEach((th, indice) => {
    const valor = localStorage.getItem(getStorageKey(table, indice))
    if (!valor) return
    const largura = Math.max(parseInt(valor, 10) || MIN_WIDTH, MIN_WIDTH)
    aplicarLarguraColuna(table, indice, largura)
  })
}

function salvarLargura(table, indice, largura) {
  localStorage.setItem(getStorageKey(table, indice), String(Math.round(largura)))
}

function aplicarLarguraColuna(table, indice, largura) {
  const headers = table.querySelectorAll('thead th')
  const header = headers[indice]
  if (header) header.style.width = `${largura}px`

  table.querySelectorAll('tbody tr').forEach((linha) => {
    const celula = linha.children[indice]
    if (!celula) return
    celula.style.width = `${largura}px`
  })
}

function prepararHeader(table, th, indice) {
  if (th.classList.contains('resizable-ready')) return
  th.classList.add('resizable-ready')
  th.style.position = 'relative'

  const alca = document.createElement('span')
  alca.className = 'col-resize-handle'
  alca.setAttribute('role', 'separator')
  alca.setAttribute('aria-label', 'Ajustar largura da coluna')

  let inicioX = 0
  let larguraInicial = 0

  const mover = (evento) => {
    const delta = evento.clientX - inicioX
    const novaLargura = Math.max(MIN_WIDTH, larguraInicial + delta)
    aplicarLarguraColuna(table, indice, novaLargura)
    salvarLargura(table, indice, novaLargura)
  }

  const finalizar = () => {
    document.removeEventListener('mousemove', mover)
    document.removeEventListener('mouseup', finalizar)
    document.body.classList.remove('resizing-column')
  }

  alca.addEventListener('mousedown', (evento) => {
    evento.preventDefault()
    evento.stopPropagation()
    inicioX = evento.clientX
    larguraInicial = th.getBoundingClientRect().width
    document.body.classList.add('resizing-column')
    document.addEventListener('mousemove', mover)
    document.addEventListener('mouseup', finalizar)
  })

  th.appendChild(alca)
}

export function habilitarResizeTabelas() {
  const tabelas = document.querySelectorAll('.tabela-container table, .modal table')
  tabelas.forEach((table, tabelaIdx) => {
    if (!table.id) table.dataset.resizeKey = `table-${tabelaIdx}`
    table.classList.add('resizable-table')
    aplicarLargurasSalvas(table)

    const headers = table.querySelectorAll('thead th')
    headers.forEach((th, indice) => prepararHeader(table, th, indice))
  })
}
