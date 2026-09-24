import Link from 'next/link';
import type { Metadata } from 'next';
import { ISSUES } from '@/lib/issues';
import { INTERPRET_MODEL } from '@/lib/ai/interpret';
import { RESEARCH_MODELS } from '@/lib/research/agent';
import { GITHUB_URL } from '@/lib/share';

export const metadata: Metadata = { title: 'How Plain Ballot works', description: 'The matching method, the dial wording, and where the AI is and isn’t used.' };

export default function Methodology() {
  return (
    <div className="wrap prose">
      <p className="back"><Link href="/">← Back to your ballot</Link></p>
      <h1 className="wordmark" style={{ fontSize: 44, textAlign: 'left' }}>How it works</h1>
      <hr className="double" />

      <h2>The short version</h2>
      <p>You choose the issues that matter to you and where you stand on each. For every contest on your ballot, we compare your dials to each candidate’s or measure’s sourced positions and show the closest match, the main reason for it, and what would change it. Matching is plain arithmetic that runs in your browser. The same answers always give the same ballot.</p>

      <h2>The math</h2>
      <p>Each dial runs from −2 to +2. For each issue you chose that a contest decides, we measure how far your dial is from the candidate’s position (0 to 4) and weight it by how much it matters to you (low 1, medium 2, high 3). The match is 100 minus the weighted average distance, scaled to 0–100.</p>
      <p>If a candidate has no sourced position on an issue, that issue is left out of their score. We never fill it in, and the ballot tells you when this happened.</p>
      <p>Judges can’t promise how they’ll rule, so appellate judges are matched only on opinions they’ve written, and trial judges only on sentencing records.</p>

      <h2>Where AI is used, and where it isn’t</h2>
      <ul>
        <li><b>Reading your words.</b> If you describe your priorities in your own words, a small model ({INTERPRET_MODEL}) turns them into dial settings, quoting the phrase each came from. You can see and change every one. Your text isn’t stored, and the model provider keeps no copy.</li>
        <li><b>Researching candidates.</b> Three independent research agents, each running on a different AI model ({RESEARCH_MODELS.join(', ')}), search the web, read the candidate’s own sources and record positions with exact quotes. If all three agree on an issue, that’s the answer. If they don’t, seven more agents run, and a position is published only if at least 6 of the 10 agree. Without a majority, the issue is left blank. The same process confirms who is on the ballot.</li>
        <li><b>Checking the quotes.</b> Every quote is fetched from its source and must appear there word for word, or the claim is thrown out. A person then reviews every claim before it’s published.</li>
        <li><b>Fixing mistakes.</b> Anyone can tap “Not right?” on a claim. The report is public, and it starts a fresh recheck with new agents. If the result changes, a correction is proposed and a person approves it.</li>
        <li><b>Not used for matching.</b> No model decides your matches or writes your explanations. Those are computed from the reviewed data.</li>
      </ul>

      <h2>The dials, word for word</h2>
      <p>Each end is worded the way its own supporters would put it. The ends aren’t all lined up left to right by party. Think a label is unfair? <a href={`${GITHUB_URL}/issues`}>Tell us</a>.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Issue</th><th>−2 end</th><th>+2 end</th></tr></thead>
          <tbody>
            {ISSUES.map((i) => (
              <tr key={i.id}><td>{i.name}</td><td>{i.left}</td><td>{i.right}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Check our work</h2>
      <p>All of the code, the dial wording and the researched positions are public at <a href={GITHUB_URL}>{GITHUB_URL.replace('https://', '')}</a>. Corrections are welcome, and every change is public.</p>
    </div>
  );
}
