# SEAL — Serviço de Almoxarifado (INI / Fiocruz)

Aplicação web para gestão de estoque, dispensas de colaboradores, pedidos e acompanhamento por dashboard.

> Projeto frontend em HTML/CSS/JS (Vanilla) com integração direta ao Supabase.

---

## Visão geral

O SEAL organiza o fluxo operacional em quatro módulos principais:

- **Dashboard (`index.html`)**: visão consolidada com cards de totais, gráficos e modal de histórico de dispensas.
- **Estoque (`pages/estoque.html`)**: cadastro, edição, clonagem, exclusão, busca e exportação de produtos.
- **Dispensa (`pages/dispensa.html`)**: consulta e cadastro de colaboradores, além de registro de dispensas.
- **Pedidos (`pages/pedidos.html`)**: montagem de pedidos, resumo, histórico e exportações.

---

## Funcionalidades

### 1) Autenticação e sessão
- Login com usuários cadastrados na tabela `usuarios`.
- Sessão com expiração automática (timeout).
- Controle básico de tentativas inválidas (bloqueio temporário no cliente).
- Compatível com senha em texto puro e hash bcrypt (quando armazenado no banco).

### 2) Dashboard
- Cards de contagem de **produtos**, **colaboradores** e **dispensas**.
- Gráficos de distribuição e comparativo por período.
- Filtro rápido por período (7, 15, 30, 60 dias e intervalo customizado).
- Modal de colaboradores com histórico de dispensas e exportação em PDF.

### 3) Estoque
- Busca por código, nome, observação, status e endereços.
- Ordenação por colunas.
- CRUD de produtos (com edição/clonagem/exclusão).
- Controle de visibilidade por perfil (ações administrativas).
- Exportação em PDF da listagem.

### 4) Dispensa
- Busca por CPF, nome, empresa e função.
- CRUD de colaboradores.
- Registro de dispensa com data/hora e usuário.
- Validação de CPF e campos obrigatórios.

### 5) Pedidos
- Inclusão de itens por código com preview automático.
- Validação de quantidade.
- Resumo antes de salvar.
- Histórico de pedidos com seleção e exportação em PDF.

---

## Stack

- **Frontend:** HTML5, CSS3 e JavaScript (ES Modules, sem framework)
- **Backend/Banco:** Supabase
- **Bibliotecas:**
  - `@supabase/supabase-js` (CDN)
  - `Chart.js`
  - `jsPDF` + `autotable`
  - `html2canvas`
  - `bcryptjs`

---

## Estrutura do projeto

```txt
projeto-seal/
├── index.html
├── pages/
│   ├── login.html
│   ├── estoque.html
│   ├── dispensa.html
│   └── pedidos.html
├── js/
│   ├── app.js
│   ├── auth.js
│   ├── config.js
│   └── modules/
│       ├── estoque.js
│       ├── dispensa.js
│       ├── pedidos.js
│       └── graficos.js
├── css/
│   ├── style.css
│   └── modules/
│       ├── global.css
│       ├── layout.css
│       ├── tabelas.css
│       ├── formularios.css
│       ├── graficos.css
│       └── responsive.css
└── img/
```

---

## Configuração

### 1) Supabase
Edite `js/config.js` com as credenciais do projeto:

```js
export const SUPABASE_URL = 'SUA_URL'
export const SUPABASE_KEY = 'SUA_CHAVE_ANON'
```

### 2) Tabelas esperadas
O frontend referencia as seguintes tabelas:

- `usuarios`
- `produtos`
- `colaboradores`
- `dispensas`
- `pedidos`
- `pedido_itens`

> Recomenda-se manter políticas RLS e permissões alinhadas ao perfil de uso da aplicação.

---

## Execução local

Como é um projeto estático com módulos ES, execute por um servidor local (não abra via `file://`).

Exemplo com Python:

```bash
python3 -m http.server 5500
```

Acesse:

```txt
http://localhost:5500
```

---

## Deploy

Projeto publicado em:

- https://felixfreitasjr.github.io/projeto-seal/

---

## Observações de manutenção

- Evite salvar dados sensíveis no `localStorage` além do estritamente necessário para sessão.
- Se possível, padronize gradualmente todas as senhas para hash bcrypt no banco.
- Para evoluções, priorize separar regras de negócio do DOM e incluir testes de integração (login, estoque, pedidos e exportações).

---

## Autor

**Felix Freitas Jr**  
INI / Fiocruz
