import { ImageResponse } from 'next/og';

export const alt = 'Plain Ballot: your ballot, matched to your priorities';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The preview card people see when the link is texted or posted.
export default function OpengraphImage() {
  const row = (label: string, filled: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, fontSize: 38, padding: '14px 0', borderBottom: '2px solid #d6d6d2' }}>
      <div style={{ width: 44, height: 28, borderRadius: '50%', border: '4px solid #121212', background: filled ? '#121212' : 'transparent' }} />
      <div style={{ display: 'flex' }}>{label}</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', color: '#121212', padding: '64px 80px', fontFamily: 'serif' }}>
        <div style={{ display: 'flex', fontSize: 96, letterSpacing: -2, borderBottom: '6px solid #121212', paddingBottom: 18 }}>Plain Ballot</div>
        <div style={{ display: 'flex', fontSize: 46, marginTop: 34, lineHeight: 1.2 }}>Every race on your ballot, matched to what you care about.</div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 30 }}>
          {row('Matched to your priorities, not ours', true)}
          {row('Every pick shows its sources', true)}
        </div>
        <div style={{ display: 'flex', marginTop: 'auto', fontSize: 28, color: '#4a4a48', fontFamily: 'sans-serif' }}>Free · Open source · Nonpartisan</div>
      </div>
    ),
    size,
  );
}
