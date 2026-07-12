import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { fetchFileContent } from "../github";
import { extractImportantLogic } from "../ast";

// Define the State
export const GraphState = Annotation.Root({
  owner: Annotation<string>({ reducer: (x, y) => y, default: () => "" }),
  repo: Annotation<string>({ reducer: (x, y) => y, default: () => "" }),
  defaultBranch: Annotation<string>({ reducer: (x, y) => y, default: () => "main" }),
  issueTitle: Annotation<string>({ reducer: (x, y) => y, default: () => "" }),
  issueBody: Annotation<string>({ reducer: (x, y) => y, default: () => "" }),
  fileTree: Annotation<string[]>({ reducer: (x, y) => y, default: () => [] }),
  targetFiles: Annotation<string[]>({
    reducer: (x, y) => y,
    default: () => [],
  }),
  extractedLogic: Annotation<string>({ reducer: (x, y) => y, default: () => "" }),
  proposedFix: Annotation<string>({ reducer: (x, y) => y, default: () => "" }),
  githubToken: Annotation<string>({ reducer: (x, y) => y, default: () => "" }),
  geminiApiKey: Annotation<string>({ reducer: (x, y) => y, default: () => "" }),
});

// Initialize Gemini model
const getModel = (geminiApiKey?: string) => {
  const resolvedKey = geminiApiKey || process.env.GEMINI_API_KEY;
  if (!resolvedKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    maxOutputTokens: 8192,
    apiKey: resolvedKey,
  });
};

// Node 1: Identify target files
export async function identifyFilesNode(state: typeof GraphState.State) {
  const model = getModel(state.geminiApiKey);
  
  const prompt = `
You are an expert software engineer.
Analyze the following GitHub issue and the provided repository file tree.
Identify up to 3 file paths that are most likely to contain the code related to this bug.
Output ONLY a valid JSON array of strings containing the exact file paths. No markdown formatting, no explanations.

Issue Title: ${state.issueTitle}
Issue Body: ${state.issueBody}

File Tree:
${state.fileTree.join('\n')}
`;

  const response = await model.invoke(prompt);
  let files: string[] = [];
  try {
    let content = response.content as string;
    const jsonMatch = content.match(/\[.*\]/);
    if (jsonMatch) {
      files = JSON.parse(jsonMatch[0]);
    } else {
      files = JSON.parse(content);
    }
    if (!Array.isArray(files)) files = [];
  } catch (error) {
    console.error("Failed to parse target files JSON:", error, response.content);
  }

  // Ensure we don't take more than 3 files
  return { targetFiles: files.slice(0, 3) };
}

// Node 2: Extract AST logic from GitHub
export async function extractLogicNode(state: typeof GraphState.State) {
  const { owner, repo, defaultBranch, targetFiles, githubToken } = state;
  let allExtractedLogic = "";

  for (const filePath of targetFiles) {
    const content = await fetchFileContent(owner, repo, filePath, defaultBranch, githubToken);
    if (!content) {
      allExtractedLogic += `--- FILE: ${filePath} ---\n// [Error: Could not fetch file content or file is empty]\n\n`;
      continue;
    }
    const extracted = extractImportantLogic(content, filePath);
    allExtractedLogic += `--- FILE: ${filePath} ---\n${extracted}\n\n`;
  }

  return { extractedLogic: allExtractedLogic };
}

// Node 3: Generate the Fix
export async function generateFixNode(state: typeof GraphState.State) {
  const model = getModel(state.geminiApiKey);

  const prompt = `You are an expert software engineer. Review this issue description and the provided code logic.
Please provide a proposed fix for the issue based on the code context. You may include a brief explanation alongside your code blocks.

Issue Title: ${state.issueTitle}
Issue Body: ${state.issueBody}

Code Context:
${state.extractedLogic}

Provide the code fix and explain what you changed.
`;

  const response = await model.invoke(prompt);
  
  // Debug raw LLM response
  const fs = await import('fs');
  fs.writeFileSync('debug-llm-response.json', JSON.stringify(response, null, 2));

  let fix = "";
  if (typeof response.content === "string") {
    fix = response.content;
  } else if (Array.isArray(response.content)) {
    fix = response.content.map(c => c.text || JSON.stringify(c)).join("\n");
  } else {
    fix = JSON.stringify(response.content);
  }

  if (!fix || fix.trim() === "") {
    fix = "// Error: The AI model returned an empty response. This might be due to safety filters or lack of context.";
  }

  return { proposedFix: fix };
}

// Compile the Graph
const workflow = new StateGraph(GraphState)
  .addNode("identifyFiles", identifyFilesNode)
  .addNode("extractLogic", extractLogicNode)
  .addNode("generateFix", generateFixNode)
  .addEdge("__start__", "identifyFiles")
  .addEdge("identifyFiles", "extractLogic")
  .addEdge("extractLogic", "generateFix")
  .addEdge("generateFix", "__end__");

export const bugWhispererAgent = workflow.compile();
