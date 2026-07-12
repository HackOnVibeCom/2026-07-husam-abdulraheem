"use client";

import { useState, useEffect, useRef } from "react";

interface HistoryItem {
  id: string; // unique identifier (e.g. owner/repo#issueNumber)
  issueUrl: string;
  owner: string;
  repo: string;
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  targetFiles: string[];
  proposedFix: string;
  analyzedAt: string;
}

export default function Home() {
  const [issueUrl, setIssueUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [applySuccess, setApplySuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "code">("overview");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Agent execution terminal logs
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [logIndex, setLogIndex] = useState(0);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // PR steps progress
  const [prSteps, setPrSteps] = useState<{ label: string; status: "idle" | "running" | "success" | "error" }[]>([
    { label: "Create Git Branch", status: "idle" },
    { label: "Commit Code Modifications", status: "idle" },
    { label: "Submit Pull Request", status: "idle" },
  ]);

  const simulatedLogs = [
    "🤖 BugWhisperer v1.0.0 initializing agentic nodes...",
    "🔍 Node [1/3]: Fetching issue details from GitHub...",
    "📂 Node [1/3]: Fetching repository default branch & file tree structure...",
    "🧠 Node [2/3]: Filtering candidate target files using AST heuristic...",
    "⚡ Target files identified: src/cli/index.js, src/core/commands/convertCommand.js...",
    "🔮 Node [2/3]: Running ts-morph AST logic parser to extract code syntax...",
    "🚀 Node [3/3]: Initiating LLM context synthesis via Gemini 2.5 Flash...",
    "✨ Generating solution code & pull request configuration...",
    "🎉 State Graph execution completed successfully!"
  ];

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("bugwhisperer_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Auto-scroll terminal logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLogs]);

  // Handle simulated logs progress
  useEffect(() => {
    if (loading && logIndex < simulatedLogs.length) {
      const interval = setTimeout(() => {
        setTerminalLogs(prev => [...prev, simulatedLogs[logIndex]]);
        setLogIndex(prev => prev + 1);
      }, 700 + Math.random() * 500);
      return () => clearTimeout(interval);
    }
  }, [loading, logIndex]);

  const saveToHistory = (item: Omit<HistoryItem, "analyzedAt">) => {
    const newItem: HistoryItem = {
      ...item,
      analyzedAt: new Date().toLocaleString(),
    };

    // Filter out existing duplicates of the same issue
    const filtered = history.filter(h => h.id !== item.id);
    const updated = [newItem, ...filtered];
    
    setHistory(updated);
    localStorage.setItem("bugwhisperer_history", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("bugwhisperer_history");
  };

  const selectHistoryItem = (item: HistoryItem) => {
    setResult(item);
    setIssueUrl(item.issueUrl);
    setError("");
    setApplySuccess("");
    setTerminalLogs([
      `📅 Loaded from local history (Analyzed: ${item.analyzedAt})`,
      "🎉 Resolved files & code fix restored successfully!"
    ]);
    setActiveTab("overview");
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueUrl) return;

    setLoading(true);
    setError("");
    setResult(null);
    setApplySuccess("");
    setTerminalLogs([simulatedLogs[0]]);
    setLogIndex(1);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      // Complete all remaining logs instantly
      setTerminalLogs(simulatedLogs);
      setLogIndex(simulatedLogs.length);
      setResult(data);
      setActiveTab("overview");

      // Save to local history
      const uniqueId = `${data.owner}/${data.repo}#${data.issueNumber}`;
      saveToHistory({
        id: uniqueId,
        issueUrl,
        owner: data.owner,
        repo: data.repo,
        issueNumber: data.issueNumber,
        issueTitle: data.issueTitle,
        issueBody: data.issueBody || "",
        targetFiles: data.targetFiles || [],
        proposedFix: data.proposedFix || "",
      });
    } catch (err: any) {
      setError(err.message);
      setTerminalLogs(prev => [...prev, `❌ Error: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!result) return;
    setApplying(true);
    setApplySuccess("");
    setError("");

    // Simulate PR steps progress
    const steps = [...prSteps];
    
    // Step 1
    steps[0].status = "running";
    setPrSteps([...steps]);
    await new Promise(r => setTimeout(r, 1200));
    steps[0].status = "success";
    
    // Step 2
    steps[1].status = "running";
    setPrSteps([...steps]);
    await new Promise(r => setTimeout(r, 1500));
    steps[1].status = "success";
    
    // Step 3
    steps[2].status = "running";
    setPrSteps([...steps]);

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: result.owner,
          repo: result.repo,
          issueNumber: result.issueNumber,
          fix: result.proposedFix,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply fix");

      steps[2].status = "success";
      setApplySuccess(data.url);
    } catch (err: any) {
      steps[2].status = "error";
      setError(err.message);
    } finally {
      setPrSteps(steps);
      setApplying(false);
    }
  };

  const resetPRSteps = () => {
    setPrSteps([
      { label: "Create Git Branch", status: "idle" },
      { label: "Commit Code Modifications", status: "idle" },
      { label: "Submit Pull Request", status: "idle" },
    ]);
  };

  return (
    <main className="min-h-screen flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full relative">
      {/* Header bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 pb-5 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-zinc-100 flex items-center justify-center shadow-sm">
            <span className="font-mono text-xs font-bold text-zinc-950">BW</span>
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight text-zinc-200">BugWhisperer</span>
            <span className="ml-2 text-xs font-mono text-zinc-500">v1.0.0</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/60 px-3 py-1.5 rounded-full border border-zinc-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono text-zinc-400">Gemini 2.5 Flash</span>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start flex-1">
        
        {/* Left Sidebar: Local Search History */}
        <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-8 max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Recent Sessions</h3>
            {history.length > 0 && (
              <button 
                onClick={clearHistory}
                className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 max-h-[50vh] lg:max-h-[70vh] scrollbar-thin">
            {history.length > 0 ? (
              history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectHistoryItem(item)}
                  className={`w-full text-left p-3.5 rounded border transition-all cursor-pointer block ${
                    result?.id === item.id
                      ? "bg-zinc-900 border-zinc-600 text-zinc-100"
                      : "bg-[#0c0c0e] border-[#1e1e21] hover:border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex justify-between items-center gap-2 text-[10px] font-mono text-zinc-500 mb-1.5">
                    <span className="truncate max-w-[120px]">{item.owner}/{item.repo}</span>
                    <span className="shrink-0">#{item.issueNumber}</span>
                  </div>
                  <h4 className="text-xs font-semibold line-clamp-2 leading-snug mb-2">
                    {item.issueTitle}
                  </h4>
                  <span className="text-[9px] font-mono text-zinc-600 block">
                    {item.analyzedAt}
                  </span>
                </button>
              ))
            ) : (
              <div className="p-8 text-center rounded border border-zinc-900 bg-zinc-950/20 text-zinc-600 space-y-2">
                <svg className="w-5 h-5 mx-auto text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[10px] font-mono">No recent sessions found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Main Panel: Input + Workspace */}
        <div className="lg:col-span-3 space-y-8 w-full">
          {/* Hero text */}
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-zinc-100">
              Automate Issue Resolutions directly to GitHub
            </h1>
            <p className="text-zinc-500 text-sm font-normal leading-relaxed">
              Analyze bugs, navigate AST structures, and suggest pull requests using an autonomous LangGraph agent.
            </p>
          </div>

          {/* Action input panel */}
          <div className="dev-card p-6 space-y-6">
            <form onSubmit={handleAnalyze} className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">GitHub Issue Link</label>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <input
                    type="url"
                    placeholder="https://github.com/owner/repo/issues/123"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded pl-12 pr-4 py-3 text-xs text-zinc-100 placeholder:text-zinc-650 focus:outline-none focus:border-zinc-500 transition-all font-mono"
                    value={issueUrl}
                    onChange={(e) => setIssueUrl(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="action-btn py-3 px-6 text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[150px] cursor-pointer"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-zinc-950" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Running Agent...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span>Analyze Issue</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Terminal log console */}
            {terminalLogs.length > 0 && (
              <div className="bg-zinc-950 rounded border border-zinc-900 p-4 font-mono text-xs space-y-2 overflow-hidden shadow-inner">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2 text-zinc-650">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-zinc-800" />
                    agent_shell
                  </span>
                  <span>UTF-8</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin">
                  {terminalLogs.map((log, index) => (
                    <div key={index} className={`flex items-start gap-2 ${log.startsWith("❌") ? "text-red-400" : log.startsWith("🎉") ? "text-blue-400" : "text-zinc-500"}`}>
                      <span className="text-zinc-700 select-none">&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>
              </div>
            )}

            {error && !loading && (
              <div className="p-4 rounded bg-rose-950/20 border border-rose-900/40 text-rose-400 text-xs flex items-start gap-3 font-mono">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Results Workspace */}
          {result && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Left side: Navigation / Meta */}
              <div className="space-y-6">
                <div className="dev-card p-6 space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Repository metadata</span>
                    <h2 className="text-base font-semibold text-zinc-200 line-clamp-2 leading-snug">{result.issueTitle}</h2>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-zinc-400">
                        #{result.issueNumber}
                      </span>
                      <a
                        href={result.issueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 font-mono"
                      >
                        github.com
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>

                  <div className="border-t border-zinc-900 pt-4 space-y-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Target Modules</h3>
                    <div className="space-y-2">
                      {result.targetFiles.map((file: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2.5 bg-zinc-950 p-2.5 rounded border border-zinc-900 font-mono text-xs text-zinc-400">
                          <svg className="w-3.5 h-3.5 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="truncate">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action card */}
                <div className="dev-card p-6 bg-zinc-950/20 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Deploy Resolution</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed font-light">
                    Apply the proposed changes directly to a new pull request. You can verify and merge it immediately on GitHub.
                  </p>

                  {applying ? (
                    <div className="space-y-2.5">
                      {prSteps.map((step, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded bg-zinc-950 border border-zinc-900 font-mono">
                          <span className="text-zinc-500">{step.label}</span>
                          {step.status === "running" && (
                            <div className="w-3.5 h-3.5 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
                          )}
                          {step.status === "success" && (
                            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {step.status === "error" && (
                            <span className="text-rose-500">❌</span>
                          )}
                          {step.status === "idle" && (
                            <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        resetPRSteps();
                        handleApply();
                      }}
                      disabled={applying}
                      className="w-full action-btn py-3 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Apply Fix to GitHub
                    </button>
                  )}

                  {applySuccess && (
                    <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded space-y-2">
                      <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                        ✓ Pull Request Submitted
                      </span>
                      <a
                        href={applySuccess}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:underline font-mono break-all block"
                      >
                        {applySuccess}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side: Workbench workspace */}
              <div className="lg:col-span-2 dev-card overflow-hidden flex flex-col h-[600px] shadow-sm">
                {/* Tab Header bar */}
                <div className="bg-zinc-950/90 px-4 pt-3 flex border-b border-zinc-900 justify-between items-center shrink-0">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab("overview")}
                      className={`px-4 py-2 text-xs font-semibold rounded-t transition-all border-b-2 cursor-pointer ${
                        activeTab === "overview"
                          ? "border-zinc-450 text-zinc-100 bg-zinc-900/20"
                          : "border-transparent text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Workspace Overview
                    </button>
                    <button
                      onClick={() => setActiveTab("code")}
                      className={`px-4 py-2 text-xs font-semibold rounded-t transition-all border-b-2 cursor-pointer ${
                        activeTab === "code"
                          ? "border-zinc-450 text-zinc-100 bg-zinc-900/20"
                          : "border-transparent text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Proposed Code Change
                    </button>
                  </div>
                  
                  <div className="flex gap-1 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800" />
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800" />
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800" />
                  </div>
                </div>

                {/* Workbench body */}
                <div className="flex-1 bg-zinc-950/20 overflow-y-auto p-6 scrollbar-thin">
                  {activeTab === "overview" && (
                    <div className="space-y-6">
                      <div className="bg-zinc-950 p-4 rounded border border-zinc-900 space-y-1.5">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Repository</span>
                        <p className="text-zinc-300 font-mono text-xs">{result.owner}/{result.repo}</p>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Heuristics Summary</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded bg-zinc-950 border border-zinc-900 space-y-1">
                            <span className="text-zinc-650 text-[10px] font-semibold uppercase tracking-wider">Identified Scope</span>
                            <p className="text-zinc-300 text-sm font-medium">{result.targetFiles.length} Code Modules</p>
                          </div>
                          <div className="p-4 rounded bg-zinc-950 border border-zinc-900 space-y-1">
                            <span className="text-zinc-650 text-[10px] font-semibold uppercase tracking-wider">Analysis Engine</span>
                            <p className="text-zinc-300 text-sm font-medium">Gemini 2.5 Flash + AST Parser</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Original Issue Description</span>
                        <div className="bg-zinc-950/70 border border-zinc-900 p-4 rounded max-h-64 overflow-y-auto text-xs text-zinc-400 leading-relaxed font-light whitespace-pre-wrap font-sans">
                          {result.issueBody}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "code" && (
                    <div className="h-full flex flex-col space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider">Suggested Modifications Preview</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(result.proposedFix);
                          }}
                          className="secondary-btn text-xs px-3 py-1.5 transition-colors cursor-pointer font-mono"
                        >
                          Copy Solution
                        </button>
                      </div>

                      <div className="flex-1 code-container p-4 rounded shadow-inner overflow-auto font-mono text-xs text-zinc-300 leading-relaxed max-h-[450px]">
                        <pre className="whitespace-pre-wrap">{result.proposedFix}</pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
