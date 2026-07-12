<div align="center">

# 🐛 BugWhisperer

### *An AI-Powered Agentic Bug Fixer for GitHub Issues*

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.4-blue?logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraphjs/)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-purple?logo=google&logoColor=white)](https://ai.google.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **Built for HackOn Vibe 2026** 🏆

[Features](#-features) • [Architecture](#️-architecture) • [Getting Started](#-getting-started) • [How It Works](#-how-it-works) • [Usage](#-usage)

</div>

---

## 🎯 The Problem

Every developer knows the pain: a bug report lands in your GitHub Issues. You have to **read the issue**, **navigate the codebase**, **find the relevant files**, **understand the logic**, and **write a fix** — all before you can even submit a pull request. For large codebases, this process can take hours.

**BugWhisperer eliminates this entire workflow in seconds.**

---

## ✨ What is BugWhisperer?

BugWhisperer is an **autonomous AI agent** that reads a GitHub issue URL and automatically:

1. 🔍 **Fetches** the issue details from GitHub
2. 🧠 **Identifies** which source files are most likely causing the bug
3. ⚡ **Parses** the code using AST (Abstract Syntax Tree) analysis
4. 🤖 **Generates** a precise fix using Gemini 2.5 Flash
5. 🚀 **Opens a Pull Request** directly to the repository

No manual intervention. Just paste a GitHub issue URL and let the agent whisper to the bug.

---

## 🚀 Features

| Feature | Description |
|---|---|
| 🤖 **Agentic Pipeline** | Multi-node LangGraph state graph orchestrates the entire analysis flow |
| 🧬 **AST Code Analysis** | Uses `ts-morph` to parse TypeScript/JavaScript into structured syntax trees |
| 🔮 **AI-Powered Fix Generation** | Gemini 2.5 Flash synthesizes context-aware code fixes |
| 🐙 **GitHub Integration** | Reads issues, fetches file trees, and creates pull requests via Octokit |
| 📊 **Live Terminal** | Real-time animated agent execution logs in the browser |
| 📜 **Analysis History** | Persists previous analyses in localStorage for quick reference |
| 🎨 **Polished UI** | Dark-themed, responsive interface with progress tracking |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BugWhisperer                            │
│                                                                 │
│   GitHub Issue URL                                              │
│        │                                                        │
│        ▼                                                        │
│  ┌───────────┐    ┌───────────────┐    ┌──────────────────┐    │
│  │  Node 1   │───▶│    Node 2     │───▶│     Node 3       │    │
│  │ Identify  │    │ Extract Logic │    │  Generate Fix    │    │
│  │  Files    │    │  (AST Parser) │    │  (Gemini 2.5)   │    │
│  └───────────┘    └───────────────┘    └──────────────────┘    │
│        │                 │                      │               │
│   GitHub API         ts-morph              LangChain +          │
│  (Octokit)          AST Engine            Google GenAI          │
│                                                │                │
│                                         Pull Request ✅         │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 |
| **AI Orchestration** | LangGraph (StateGraph) + LangChain Google GenAI |
| **LLM** | Google Gemini 2.5 Flash |
| **Code Analysis** | ts-morph (TypeScript/JavaScript AST) |
| **GitHub API** | Octokit REST |

---

## 🔄 How It Works

### The 3-Node Agentic Graph

```
__start__
    │
    ▼
[Node 1] identifyFilesNode
  • Sends issue title + body + full file tree to Gemini
  • AI returns the top 3 most relevant file paths
    │
    ▼
[Node 2] extractLogicNode
  • Fetches each file's content from GitHub via Octokit
  • Runs ts-morph AST parser to extract functions, classes & arrow functions
  • Builds a structured, compact code context for the LLM
    │
    ▼
[Node 3] generateFixNode
  • Sends issue description + extracted code context to Gemini 2.5 Flash
  • AI produces a targeted code fix with explanation
    │
    ▼
__end__  →  Apply Fix → Open Pull Request
```

---

## ⚡ Getting Started

### Prerequisites

- Node.js >= 18
- A GitHub Personal Access Token (with `repo` scope)
- A Google Gemini API Key

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/bug-whisperer.git
cd bug-whisperer

# Install dependencies
npm install
```

### Environment Setup

```bash
# Copy the example env file
cp .env.example .env.local
```

Fill in your credentials in `.env.local`:

```env
GITHUB_TOKEN=your_github_personal_access_token
GEMINI_API_KEY=your_gemini_api_key
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎮 Usage

1. **Paste** a GitHub issue URL into the input field:
   ```
   https://github.com/owner/repo/issues/42
   ```
2. **Click** `Analyze Issue` and watch the live agent terminal execute in real time
3. **Review** the AI-generated fix in the **Code Fix** tab
4. **Click** `Apply Fix & Open PR` to submit a pull request automatically

---

## 📁 Project Structure

```
bug-whisperer/
├── src/
│   └── app/
│       ├── page.tsx          # Main UI — issue input, terminal, results
│       ├── layout.tsx        # App layout & metadata
│       └── api/
│           ├── analyze/      # POST /api/analyze — runs the LangGraph agent
│           └── apply/        # POST /api/apply  — creates the GitHub PR
├── lib/
│   ├── langgraph/
│   │   └── agent.ts          # 3-node LangGraph StateGraph definition
│   ├── github.ts             # GitHub API helpers (Octokit)
│   └── ast.ts                # ts-morph AST logic extractor
├── .env.example              # Required environment variables template
└── README.md
```

---

## 🔐 Environment Variables

| Variable | Description | Required |
|---|---|---|
| `GITHUB_TOKEN` | GitHub Personal Access Token with `repo` scope | ✅ |
| `GEMINI_API_KEY` | Google AI Studio API Key | ✅ |

---

## 🧠 Team

Built with ❤️ by **Husam Abdulraheem** at **HackOn Vibe 2026**

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**Made for HackOn Vibe 2026** 🚀

*"Let the AI whisper to your bugs — so you don't have to shout."*

</div>
