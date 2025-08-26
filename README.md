# 🗄️ AI Database Studio

> A private, intelligent desktop app for managing PostgreSQL, MySQL, SQLite, and MongoDB — with AI assistance built around *your* data.

[![Electron](https://img.shields.io/badge/Electron-35.1.5-47848F?style=flat-square&logo=electron)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Stars](https://img.shields.io/github/stars/anmoldobariya/ai-db-studio?style=flat-square)](https://github.com/anmoldobariya/ai-db-studio/stargazers)
[![Forks](https://img.shields.io/github/forks/anmoldobariya/ai-db-studio?style=flat-square)](https://github.com/anmoldobariya/ai-db-studio/network)

**AI Database Studio** is a modern, cross-platform desktop application that simplifies database management through an intuitive interface powered by artificial intelligence. Built with Electron, React, and TypeScript, it provides developers and database administrators with powerful tools for connecting to, querying, and managing multiple database systems.

![AI Database Studio Screenshot](docs/images/screenshot.png)

> 🔐 **No login. No cloud. No data leaves your machine.**

---

## 🌟 Why This Exists

Most AI-powered database tools:
- Send your queries to third-party servers
- Use generic models trained on public data
- Lack understanding of your specific schema or workflows

**AI Database Studio** is different:

✅ Built for developers who value **privacy and personalization**  
✅ All data stays local — never uploaded  
✅ AI will be trained on *your* queries, tables, and patterns  
✅ Future: a truly personal AI assistant that learns how *you* work
✅ Cross-platform compatibility (Windows, macOS, Linux)

> 💬 *"I built this because I wanted a database tool that doesn’t just know SQL — it learns how *I* write it."*

---

## ✨ Key Features

### 🔒 **Privacy-First Design**
- No user accounts, no signups, no backend
- All databases, queries, and schema stay on your device
- Zero telemetry, zero tracking
- Ideal for sensitive projects (enterprise, healthcare, government)

### 🤖 **Personal AI Assistant (Future Goal)**
- AI will be trained on *your* data over time
- Understands your schema, naming conventions, and query style
- Learns from your past queries and preferences
- Fully runs locally — no internet required

> 🔮 **Coming Soon**: A custom AI model trained by me — based on my own usage patterns — that evolves with me.

### 🔗 **Multi-Database Support**
| Database   | Status                               |
|------------|--------------------------------------|
| PostgreSQL | ✅ Full support + ERD                |
| MySQL      | ✅ Complete SQL operations           |
| SQLite     | ✅ Local file-based management       |
| MongoDB    | ✅ Document operations & aggregation |

### 📝 **Smart Query Editor**
- Monaco Editor with syntax highlighting
- Auto-completion for tables, columns, keywords
- Real-time validation & error detection
- Multi-tab queries + execution history

### 📊 **Data Visualization & Schema Tools**
- Interactive data tables (sort/filter/export)
- Auto-generated Entity Relationship Diagrams (ERD)
- Export to CSV, JSON, Excel
- Visual schema exploration

---

## 🚀 Quick Start

### Prerequisites
- Node.js v22+
- pnpm (recommended)
- A supported database server (or SQLite file)

### Installation
```bash
git clone https://github.com/anmoldobariya/ai-db-studio.git
cd ai-db-studio
pnpm install
pnpm dev
```

### Build for Production
```bash
pnpm build          # Build for current platform
pnpm build:win      # Windows
pnpm build:mac      # macOS
pnpm build:linux    # Linux
```

---

## 🎯 Usage

### 1. Create a Connection
- Click **"Add New Connection"**
- Choose type: PostgreSQL, MySQL, SQLite, or MongoDB
- Enter credentials (or file path for SQLite)
- Test connection → Save

### 2. Write & Run Queries
- Select a table → auto-generates `SELECT *`
- Edit in AI-enhanced editor
- Press `Ctrl+Enter` to run
- View results in interactive table

### 3. Use AI Assistant
- Click **"Show AI Chat"**
- Type: _“Get all active users from last week”_
- Get instant SQL suggestion
- Apply suggestion directly


## 🏗️ Architecture

The application follows a multi-process Electron architecture:

```
┌──────────────────┐    ┌─────────────────┐    ┌────────────────────┐
│   Main Process   │◄──►│ Preload Script  │◄──►│Renderer Process    │
│                  │    │                 │    │                    │
│ • DB Connections │    │ • Secure IPC    │    │ • React UI         │
│ • File System    │    │ • API Bridge    │    │ • User Interaction │
│ • AI Integration │    │ • Type Safety   │    │ • State Management │
└──────────────────┘    └─────────────────┘    └────────────────────┘
```

> 🔑 **Note**: Currently, AI uses secure hosted APIs. But future versions will run your *own custom model* locally — trained on your data.

---

## 🔮 Future: Your Personal AI Model (Planned)

I’m building toward a future where:
- The AI isn’t generic — it’s **trained on *my* real-world queries and schema**
- It learns how I structure tables, name columns, and write logic
- It becomes a **personal assistant** — not just a tool

### What’s Coming?
- On-device training pipeline (using my own dataset)
- Lightweight model architecture optimized for local inference
- Privacy-preserving fine-tuning (no external data transfer)
- Offline mode: AI works without internet

---

## 🗺️ Roadmap

### Phase 1: Core Stability (Done)
- Multi-database support
- Hosted AI assistant (for now)
- Local-first architecture

### Phase 2: Enhanced User Experience & Performance
- Advanced query history & bookmarks
- Smart editor features (auto-completion, formatting)
- Virtual scrolling for large datasets
- Export improvements (JSON, XML, Parquet)

### Phase 3: AI Integration & Intelligence
- Natural language → SQL conversion
- Query optimization suggestions
- Schema analysis & documentation
- Data profiling & anomaly detection

### Phase 4: Personal AI Model (Upcoming)
- Train a custom model on *your own* query history
- Fine-tune on schema patterns and naming conventions
- Deploy locally — no cloud, no API keys
- Fully private, self-evolving AI assistant

> 🔒 Final Goal: A database tool where **the AI learns from *you*, not the internet**.

---

## 🛠️ Development

### Recommended Setup
- **[VSCode](https://code.visualstudio.com/)** with the following extensions:
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  - [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
  - [TypeScript](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-next)
  - [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

### Project Structure
```
ai-db-studio/
├── src/
│   ├── main/           # Electron main process
│   ├── preload/        # Secure IPC bridge
│   └── renderer/       # React + TypeScript UI
├── docs/               # Docs, screenshots
├── ROADMAP.md          # Future vision
└── LICENSE             # MIT License
```

### Available Scripts
```bash
pnpm dev              # Start dev server
pnpm typecheck        # Check types
pnpm lint             # Run ESLint
pnpm format           # Format code
pnpm build            # Build app
pnpm build:win        # Windows
pnpm build:mac        # macOS
pnpm build:linux      # Linux
```

---

## 🤝 Contributing

I welcome contributions! Whether you're fixing bugs, improving docs, or adding new features:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/awesome`)
3. Commit changes (`git commit -m "feat: add X"`)
4. Push to branch (`git push origin feature/awesome`)
5. Open a Pull Request

> ✍️ Follow conventional commits, add tests, and update documentation.

> I'm building something that combines **AI, privacy, and personalization** — and I believe it belongs in the hands of a visionary team.

---

## 📄 License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

If you encounter any issues or have questions:

- **Bug Reports**: [Open an issue](https://github.com/anmoldobariya/ai-db-studio/issues)
- **Feature Requests**: [Start a discussion](https://github.com/anmoldobariya/ai-db-studio/discussions)

## 🎉 Acknowledgments

- **[Electron](https://electronjs.org/)** for the cross-platform framework
- **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** for the powerful code editor
- **[React](https://reactjs.org/)** and **[TypeScript](https://typescriptlang.org/)** for the robust frontend
- **[Tailwind CSS](https://tailwindcss.com/)** for beautiful styling
- **[Radix UI](https://radix-ui.com/)** for accessible components

---

<div align="center">
  <strong>Built with ❤️ for developers who care about their data — and their own AI</strong>
</div>