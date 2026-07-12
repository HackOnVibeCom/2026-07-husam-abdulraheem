import { NextResponse } from 'next/server';
import { fetchIssueDetails, fetchRepositoryTree } from '@/lib/github';
import { bugWhispererAgent } from '@/lib/langgraph/agent';

export async function POST(req: Request) {
  try {
    const { issueUrl, githubToken, geminiApiKey } = await req.json();

    if (!issueUrl) {
      return NextResponse.json({ error: 'Missing issueUrl' }, { status: 400 });
    }

    if (!githubToken && !process.env.GITHUB_TOKEN) {
      return NextResponse.json({ error: 'GitHub token is required. Please add your GitHub token in the API Settings panel.' }, { status: 400 });
    }

    if (!geminiApiKey && !process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key is required. Please add your Gemini API key in the API Settings panel.' }, { status: 400 });
    }

    // Parse GitHub URL (e.g., https://github.com/owner/repo/issues/123)
    const match = issueUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid GitHub issue URL' }, { status: 400 });
    }

    const [, owner, repo, issueNumberStr] = match;
    const issueNumber = parseInt(issueNumberStr, 10);

    // 1. Fetch Issue Details & Repository Default Branch
    const [issueData, repoData] = await Promise.all([
      fetchIssueDetails(owner, repo, issueNumber, githubToken),
      (await import('@/lib/github')).getOctokit(githubToken).rest.repos.get({ owner, repo })
    ]);
    
    const { title: issueTitle, body: issueBody } = issueData;
    const defaultBranch = repoData.data.default_branch;

    // 2. Fetch Repository Tree using correct branch
    const fileTree = await fetchRepositoryTree(owner, repo, defaultBranch, githubToken);

    // 3. Run LangGraph Workflow
    const initialState = {
      owner,
      repo,
      issueTitle,
      issueBody,
      fileTree,
      defaultBranch,
      targetFiles: [],
      extractedLogic: "",
      proposedFix: "",
      githubToken: githubToken || "",
      geminiApiKey: geminiApiKey || "",
    };

    const finalState = await bugWhispererAgent.invoke(initialState);
    
    // Debug logging
    const fs = await import('fs');
    fs.writeFileSync('debug-state.json', JSON.stringify(finalState, null, 2));

    return NextResponse.json({
      success: true,
      owner,
      repo,
      issueNumber,
      issueTitle,
      issueBody,
      targetFiles: finalState.targetFiles,
      proposedFix: finalState.proposedFix,
    });
  } catch (error: any) {
    console.error('Analyze API Error:', error);
    const message = error?.message || 'An error occurred during analysis';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
