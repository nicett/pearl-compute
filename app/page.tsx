import MinerCalculator from './MinerCalculator';
import { DEFAULT_INITIAL_DATA } from './initial-data';

export default function Home() {
  return <MinerCalculator initialData={DEFAULT_INITIAL_DATA} />;
}
