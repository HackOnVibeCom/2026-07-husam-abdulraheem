# HackOnVibe — Project Questionnaire

**1. What does your application/service do?**

BugWhisperer is an autonomous AI agent that reads a GitHub issue URL and automatically fixes the bug. It fetches the issue details from GitHub, identifies the source files most likely responsible, parses the code with AST (Abstract Syntax Tree) analysis via `ts-morph`, generates a targeted fix using Google Gemini 2.5 Flash, and opens a pull request directly to the repository — with no manual intervention. It is built on a 3-node LangGraph state graph with Next.js 16 / React 19 and Octokit.

**2. Who is the target audience?**

Software developers and engineering teams who triage bug reports in GitHub Issues — especially those working on large codebases, where manually reading the issue, navigating the code, locating the relevant files, understanding the logic, and writing a fix can take hours.

**3. Which countries are the expected buyers of this service?**

_(not provided)_

**4. Who are your competitors?**

_(not provided)_

**5. What is your advantage?**

BugWhisperer collapses the entire read-issue → navigate-codebase → find-files → understand-logic → write-fix workflow from hours into seconds. It runs fully autonomously as an agentic LangGraph pipeline, grounds its fix in the real code through AST parsing rather than guesswork, and goes end-to-end from a pasted issue URL to an opened pull request.
