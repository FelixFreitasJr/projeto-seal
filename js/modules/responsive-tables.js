function limparTextoCabecalho(texto = '') {
  return texto.replace(/\s+/g, ' ').trim()
}

function aplicarRotulosTabela(table) {
  if (!table) return

  const headers = Array.from(table.querySelectorAll('thead th')).map((th) =>
    limparTextoCabecalho(th.textContent || '')
  )

  if (!headers.length) return

  table.querySelectorAll('tbody tr').forEach((tr) => {
    const cells = tr.querySelectorAll('td')
    cells.forEach((td, index) => {
      if (!td.dataset.label) {
        td.dataset.label = headers[index] || `Coluna ${index + 1}`
      }
    })
  })
}

export function initResponsiveTables() {
  const tables = Array.from(document.querySelectorAll('table'))
  tables.forEach((table) => {
    aplicarRotulosTabela(table)

    const observer = new MutationObserver(() => aplicarRotulosTabela(table))
    observer.observe(table, {
      childList: true,
      subtree: true
    })
  })
}
