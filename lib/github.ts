import { Octokit } from "octokit";

export const getOctokit = () => {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN is not set");
  }
  return new Octokit({ auth: process.env.GITHUB_TOKEN });
};

export async function fetchIssueDetails(owner: string, repo: string, issueNumber: number) {
  const octokit = getOctokit();
  const response = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });
  return {
    title: response.data.title,
    body: response.data.body || "",
  };
}

export async function fetchRepositoryTree(owner: string, repo: string, defaultBranch: string = "main") {
  const octokit = getOctokit();
  const response = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: defaultBranch,
    recursive: "1",
  });

  // Aggressive filtering: keep only actual code files
  const allowedExtensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".java", ".c", ".cpp", ".rs", ".rb", ".php"];
  const excludedDirs = ["node_modules", "dist", ".git", ".next", "build", "public", "assets", "docs", "tests", "test"];

  const tree = response.data.tree
    .filter((item) => item.type === "blob")
    .map((item) => item.path as string)
    .filter((path) => {
      if (!path) return false;
      const lowerPath = path.toLowerCase();
      // Exclude specific directories
      if (excludedDirs.some((dir) => lowerPath.includes(`/${dir}/`) || lowerPath.startsWith(`${dir}/`))) {
        return false;
      }
      // Keep only specific extensions
      if (!allowedExtensions.some((ext) => lowerPath.endsWith(ext))) {
        return false;
      }
      // Exclude config files
      if (lowerPath.includes("config") || lowerPath.endsWith(".d.ts") || lowerPath.includes("setup")) {
        return false;
      }
      return true;
    });

  return tree;
}

export async function fetchFileContent(owner: string, repo: string, path: string, branch: string = "main") {
  const octokit = getOctokit();
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    if ("content" in response.data) {
      return Buffer.from(response.data.content, "base64").toString("utf-8");
    }
    return "";
  } catch (error) {
    console.error(`Error fetching file content for ${path}:`, error);
    return "";
  }
}

export async function createIssueComment(owner: string, repo: string, issueNumber: number, body: string) {
  const octokit = getOctokit();
  const response = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
  return response.data;
}
