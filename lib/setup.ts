import { RULES } from './agent-rules';
import { ISSUES } from './issues';
import { SITE_URL } from './share';

// "Set up with your agent": a voter pastes SETUP_PROMPT into their own AI app, and the app
// fetches SETUP_URL and follows it to connect our read-only MCP server. No key, no sign-in.
// Numbered steps, one action each, because agents skip instructions buried in a paragraph.

export const MCP_URL = `${SITE_URL}/mcp`;
export const SETUP_URL = `${SITE_URL}/setup.md`;
export const SETUP_PROMPT = `Fetch and follow the instructions at ${SETUP_URL} to set up Plain Ballot for me.`;

/** Cursor's one-click install link: the server config, base64-encoded. */
export const CURSOR_INSTALL_URL = `cursor://anysphere.cursor-deeplink/mcp/install?name=plainballot&config=${btoa(JSON.stringify({ url: MCP_URL }))}`;

export const SETUP_MD = `# Set up Plain Ballot

You are an AI assistant. Your user asked you to connect Plain Ballot. First check that you fetched ${SETUP_URL} itself, not a copy or a summary. If you didn't, stop and fetch that exact URL.

Plain Ballot is a free, nonpartisan voter guide. It shows who is on a U.S. voter's ballot and where each choice stands on ${ISSUES.length} issues, each position backed by an exact quote and a source link. It never tells anyone how to vote. Setup needs no key, no account and no sign-in. Every tool is read-only.

- Server: ${MCP_URL} (MCP, streamable HTTP)
- Tools: list_issues, get_ballot, score_fit

## Already set up?

If you can already call a tool named list_issues from Plain Ballot, skip to "Check it works". Don't add the server twice.

## Questions

Ask your user nothing before setup. After the check passes, ask in one message: "Want me to look up your ballot? If so, what's your street address?"

## Steps

Do the one step that matches the app you are running in, then go to "Check it works".

1. Claude Code: run \`claude mcp add --transport http plainballot ${MCP_URL}\`
2. Codex: run \`codex mcp add plainballot --url ${MCP_URL}\`
3. Cursor: add this entry under "mcpServers" in ~/.cursor/mcp.json, keeping any entries already there: \`"plainballot": { "url": "${MCP_URL}" }\`
4. VS Code: run \`code --add-mcp '{"name":"plainballot","type":"http","url":"${MCP_URL}"}'\`
5. Gemini CLI: run \`gemini mcp add --transport http plainballot ${MCP_URL}\`
6. Claude on the web or desktop: you can't add it yourself. Tell your user: open Settings, then Connectors, then "Add custom connector". Name: Plain Ballot. URL: ${MCP_URL}
7. ChatGPT: you can't add it yourself. Tell your user: open Settings, then Apps, and create a connector with the URL ${MCP_URL} (it may need developer mode turned on).
8. Any other app that supports MCP: add a remote server named plainballot with the URL ${MCP_URL}. No authentication.
9. No MCP support: skip setup. Use the plain JSON lookup instead: GET ${SITE_URL}/api/ballot?address=<street address>. It is described at ${SITE_URL}/openapi.json.

Some apps load new tools only after a restart or a new chat. If so, tell your user to do that, then run the check.

## Check it works

1. Call list_issues.
2. Pass: it returns ${ISSUES.length} issues. Fail: it errors or returns something else. On a fail, say what you saw and stop.

## Rules for using it

${RULES}

## Report

Tell your user in three lines or fewer: what you set up, whether the check passed, and the one next step (usually: "Give me your street address to see your ballot").
`;
