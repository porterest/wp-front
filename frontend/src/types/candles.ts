import { PairOption } from "./pair";

export interface CandleData {
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  block_number: number;
  timestamp: number;
}

export interface CandleDataContextValue {
  data: CandleData[];
  selectedPair: PairOption | null;
  setSymbol: (symbol: PairOption) => void;
  isLoading: boolean;
  error: string | null;
}