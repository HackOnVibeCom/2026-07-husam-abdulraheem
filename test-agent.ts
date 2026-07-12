import { GraphState } from "./lib/langgraph/agent";
import { StateGraph } from "@langchain/langgraph";
import { identifyFilesNode, extractLogicNode, generateFixNode } from "./lib/langgraph/agent";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const state = {
    owner: "Husam-Abdulraheem",
    repo: "retransify",
    issueTitle: "[BUG] Localized template cache is silently ignored when running compile with --clear-cache flag",
    issueBody: "When running the convert command...",
    defaultBranch: "main",
    fileTree: [
      "src/cli/index.js",
      "src/core/commands/convertCommand.js",
      "src/core/graph/nodes/cacheLoaderNode.js"
    ],
    targetFiles: [
      "src/cli/index.js",
      "src/core/commands/convertCommand.js",
      "src/core/graph/nodes/cacheLoaderNode.js"
    ],
    extractedLogic: "const dummy = true;",
    proposedFix: ""
  };

  try {
    console.log("Running generateFixNode...");
    const result = await generateFixNode(state);
    console.log("Result:", result);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
