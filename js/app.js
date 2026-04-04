import { iniciarEstoque } from './modules/estoque.js'
import { iniciarDispensa } from './modules/dispensa.js'

document.addEventListener('DOMContentLoaded', () => {

  const pagina = window.location.pathname

  if (pagina.includes('estoque.html')) {
    iniciarEstoque()
  }

  if (pagina.includes('dispensa.html')) {
    iniciarDispensa()
  }

})