import { Paper } from '@/components/Paper';
import { SAMPLE_BALLOT } from '@/lib/ballot/sample';
import './paper.css';

export default function Home() {
  return <Paper sample={SAMPLE_BALLOT} />;
}
