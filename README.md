# Licuri (Planner Task)

Um aplicativo desktop moderno e minimalista para planejamento e gerenciamento de tarefas cotidianas, desenvolvido com **React**, **Vite** e **Tauri v2**. O Licuri armazena suas tarefas localmente de forma segura e rápida através de um banco de dados SQLite embarcado.

---

## Como Iniciar

### Pré-requisitos
Certifique-se de possuir o ambiente do Tauri configurado em sua máquina (incluindo Rust, Node.js e gerenciador de pacotes).

### Instalação de Dependências
```bash
npm install
```

### Desenvolvimento
Inicie o servidor de desenvolvimento do Vite e o Tauri:
```bash
npm run tauri dev
```

### Build
Gere o instalador de produção otimizado para o seu sistema operacional:
```bash
npm run tauri build
```

---

## Estrutura do Projeto

Abaixo está descrita a organização de pastas do projeto:

```bash
licuri/
├── src-tauri/             # Configurações nativas (Rust) e manifesto do Tauri
│   ├── capabilities/      # Definições de permissões de segurança do app
│   ├── src/               # Código fonte nativo em Rust (entrypoint da aplicação)
│   └── tauri.conf.json    # Arquivo de configuração principal do Tauri v2
│
├── src/                   # Interface do usuário (React + JavaScript)
│   ├── components/        # Componentes reutilizáveis da interface
│   │   ├── ChecklistItem.jsx   # Item de checklist individual
│   │   ├── MiniCalendar.jsx    # Componente de calendário compacto
│   │   ├── ProgressbarTask.jsx # Barra de progresso para tarefas
│   │   ├── StatusBadge.jsx     # Indicador visual do status da tarefa
│   │   ├── TaskSidebar.jsx     # Barra lateral com navegação e filtros
│   │   ├── TaskView.jsx        # Área principal de exibição/detalhes da tarefa
│   │   └── Titlebar.jsx        # Barra de título personalizada da janela
│   │
│   ├── hooks/             # Custom Hooks do React
│   │   └── useTasks.js    # Gerenciamento de estado e chamadas ao banco de dados
│   │
│   ├── db.js              # Inicialização do banco SQLite via Tauri SQL Plugin
│   ├── App.jsx            # Componente raiz da aplicação
│   ├── main.jsx           # Entrypoint do React
│   └── App.css            # Estilização global da interface
│
├── index.html             # Template HTML principal
├── package.json           # Dependências e scripts do Node.js
└── vite.config.js         # Configurações de build do Vite
```

---

## Tecnologias Utilizadas

- **Frontend**: [React](https://react.dev/) + [Vite](https://vite.dev/)
- **Desktop Runtime**: [Tauri v2](https://tauri.app/) (Core em Rust)
- **Banco de Dados**: SQLite (via `@tauri-apps/plugin-sql`)
- **Estilização**: Vanilla CSS
- **Ícones**: Iconify (via `@iconify/react`)
