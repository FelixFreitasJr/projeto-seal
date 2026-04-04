import { initEstoque } from './modules/estoque.js'
import { initDispensa } from './modules/dispensa.js'

document.addEventListener('DOMContentLoaded', () => {
  const pagina = window.location.href

  if (pagina.endsWith("estoque.html")) {
    initEstoque()
  }

  if (pagina.endsWith("dispensa.html")) {
    initDispensa()
  }
})

window.ir = function(pagina) {
  if (window.location.pathname.includes('/pages/')) {
    window.location.href = pagina
  } else {
    window.location.href = 'pages/' + pagina
  }
}

// Funções globais para ações nos itens
window.editarItem = (id) => console.log("Editar", id)
window.clonarItem = (id) => console.log("Clonar", id)
window.excluirItem = (id) => console.log("Excluir", id)
window.toggleMenu = (btn) => {
  const menu = btn.nextElementSibling
  menu.classList.toggle("hidden")
}
