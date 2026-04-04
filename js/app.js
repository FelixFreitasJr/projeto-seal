import { initEstoque } from 'modules/estoque.js'
import { initDispensa } from 'modules/dispensa.js'

// =========================
// INIT POR PÁGINA
// =========================

document.addEventListener('DOMContentLoaded', () => {

  const pagina = window.location.pathname

  if (pagina.includes('estoque.html')) {
    initEstoque()
  }

  if (pagina.includes('dispensa.html')) {
    initDispensa()
  }

})

// =========================
// NAVEGAÇÃO GLOBAL
// =========================

window.ir = function(pagina) {

  // 🔥 resolve problema do GitHub Pages
  if (window.location.pathname.includes('/pages/')) {
    window.location.href = pagina
  } else {
    window.location.href = 'pages/' + pagina
  }

}