import { BallotApp } from '@/components/BallotApp';
import { SAMPLE_BALLOT } from '@/lib/ballot/sample';

export default function Home() {
  return <BallotApp initialBallot={SAMPLE_BALLOT} />;
}
