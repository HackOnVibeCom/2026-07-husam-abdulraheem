type AnalyzeIssueInput = {
  issueUrl: string;
  githubToken?: string;
  geminiApiKey?: string;
};

export type AnalyzeIssueResult = {
  success: boolean;
  owner: string;
  repo: string;
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  targetFiles: string[];
  proposedFix: string;
};

export type ApplyFixInput = {
  owner: string;
  repo: string;
  issueNumber: number;
  fix: string;
  githubToken?: string;
};

export type ApplyFixResult = {
  success: boolean;
  url: string;
};

function parseIssueUrl(issueUrl: string) {
  const match = issueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/i);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    issueNumber: Number(match[3]),
  };
}

async function githubRequest<T = any>(url: string, token?: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers || {}),
    },
  });

  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message = data?.message || data || "GitHub API request failed";
    throw new Error(message);
  }

  return data as T;
}

function decodeBase64Content(content: string) {
  try {
    const normalized = content.replace(/\s/g, "");
    const bytes = Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

async function callGemini(prompt: string, apiKey?: string) {
  if (!apiKey) {
    throw new Error("Gemini API key is required.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error?.message || "Gemini request failed");
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

async function identifyTargetFiles(issueTitle: string, issueBody: string, fileTree: string[], apiKey?: string) {
  const prompt = `You are an expert software engineer. Analyze the issue and repository file tree. Choose up to 3 likely files that should be inspected. Return ONLY a valid JSON array of file paths.\n\nIssue Title: ${issueTitle}\nIssue Body: ${issueBody}\n\nFile Tree:\n${fileTree.join("\n")}`;

  const content = await callGemini(prompt, apiKey);
  try {
    const match = content.match(/\[[\s\S]*\]/);
    const parsed = match ? JSON.parse(match[0]) : JSON.parse(content);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
}

async function fetchRepositoryTree(owner: string, repo: string, defaultBranch: string, token?: string) {
  const data = await githubRequest<any>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
    token
  );

  const allowedExtensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".java", ".c", ".cpp", ".rs", ".rb", ".php"];
  const excludedDirs = ["node_modules", "dist", ".git", ".next", "build", "public", "assets", "docs", "tests", "test"];

  return (data.tree || [])
    .filter((item: any) => item.type === "blob")
    .map((item: any) => item.path as string)
    .filter((path: string) => {
      if (!path) return false;
      const lowerPath = path.toLowerCase();
      if (excludedDirs.some((dir) => lowerPath.includes(`/${dir}/`) || lowerPath.startsWith(`${dir}/`))) {
        return false;
      }
      if (!allowedExtensions.some((ext) => lowerPath.endsWith(ext))) {
        return false;
      }
      if (lowerPath.includes("config") || lowerPath.endsWith(".d.ts") || lowerPath.includes("setup")) {
        return false;
      }
      return true;
    });
}

async function fetchFileContent(owner: string, repo: string, path: string, branch: string, token?: string) {
  const data = await githubRequest<any>(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`,
    token
  );

  if (data?.content && data?.encoding === "base64") {
    return decodeBase64Content(data.content);
  }

  return "";
}

export async function analyzeIssueClientSide({ issueUrl, githubToken, geminiApiKey }: AnalyzeIssueInput): Promise<AnalyzeIssueResult> {
  const parsed = parseIssueUrl(issueUrl);
  if (!parsed) {
    throw new Error("Invalid GitHub issue URL");
  }

  if (!geminiApiKey) {
    throw new Error("Gemini API key is required. Please add your Gemini key in the API Settings panel.");
  }

  const { owner, repo, issueNumber } = parsed;
  const [issueData, repoData] = await Promise.all([
    githubRequest<any>(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, githubToken),
    githubRequest<any>(`https://api.github.com/repos/${owner}/${repo}`, githubToken),
  ]);

  const issueTitle = issueData.title || "";
  const issueBody = issueData.body || "";
  const defaultBranch = repoData.default_branch || "main";
  const fileTree = await fetchRepositoryTree(owner, repo, defaultBranch, githubToken);

  const targetFiles = await identifyTargetFiles(issueTitle, issueBody, fileTree, geminiApiKey);

  const contextFiles = await Promise.all(
    targetFiles.map(async (filePath) => {
      const content = await fetchFileContent(owner, repo, filePath, defaultBranch, githubToken);
      return `--- FILE: ${filePath} ---\n${content.slice(0, 18000)}\n`;
    })
  );

  const prompt = `You are an expert software engineer. Review the issue and the relevant source files. Provide a concise proposed fix. Include a short explanation and code blocks if helpful.\n\nIssue Title: ${issueTitle}\nIssue Body: ${issueBody}\n\nRelevant Files:\n${contextFiles.join("\n")}`;

  const proposedFix = await callGemini(prompt, geminiApiKey);

  return {
    success: true,
    owner,
    repo,
    issueNumber,
    issueTitle,
    issueBody,
    targetFiles,
    proposedFix,
  };
}

export async function applyFixClientSide({ owner, repo, issueNumber, fix, githubToken }: ApplyFixInput): Promise<ApplyFixResult> {
  if (!githubToken) {
    throw new Error("GitHub token is required to apply the fix.");
  }

  const commentBody = `### Proposed fix generated by BugWhisperer 🐛\n\nHere is the suggested fix for this issue:\n\n\`\`\`typescript\n${fix}\n\`\`\`\n`;

  const data = await githubRequest<any>(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    githubToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody }),
    }
  );

  return {
    success: true,
    url: data.html_url || "",
  };
}
