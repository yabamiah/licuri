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

## Acesso rápido pela bandeja

Enquanto o Licuri estiver em execução, o ícone da bandeja mantém um acesso
compacto às tarefas fixadas:

- marque uma tarefa com a estrela na janela principal;
- no Windows e macOS, clique no ícone da bandeja para abrir o flyout;
- no Linux, abra **Tarefas importantes** pelo menu do ícone da bandeja;
- expanda uma tarefa e marque ou desmarque seus passos diretamente no flyout;
- clique fora ou pressione `Esc` para fechar o acesso rápido.

Tarefas concluídas deixam a lista na próxima abertura do flyout. A janela
principal continua sendo o local para criar, editar e excluir tarefas.

## Lembretes recorrentes

Cada tarefa aberta possui um botão **Lembrete** ao lado do prazo. É possível:

- usar os intervalos de 30 minutos, 1, 3, 6, 12 ou 24 horas;
- informar uma quantidade personalizada em minutos, horas ou dias;
- enviar uma notificação de teste antes de ativar;
- atualizar ou desativar o lembrete quando quiser.

Os lembretes usam notificações nativas do sistema e continuam contando com a
janela escondida na bandeja. O Licuri precisa permanecer em execução. Ao
concluir a tarefa, o lembrete é desativado automaticamente.

No macOS, a versão `.app` consulta a permissão real do Notification Center e é
assinada de forma ad-hoc para uso local. Durante `tauri dev`, o Licuri usa um
fallback de desenvolvimento do próprio macOS; o botão de teste informa esse
modo explicitamente. Para distribuir o app, substitua a assinatura ad-hoc por
um certificado Apple e faça a notarização.

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
