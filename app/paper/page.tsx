import type { Metadata } from 'next';
import { Paper } from '@/components/Paper';
import { SAMPLE_BALLOT } from '@/lib/ballot/sample';
import './paper.css';

export const metadata: Metadata = { title: 'Plain Ballot', robots: { index: false } };

export default function PaperPage() {
  return <Paper sample={SAMPLE_BALLOT} />;
}
