export interface ProofData {
  address: string;
  network: string;
  public_key: string;
  proof: {
    timestamp: number;
    domain: {
      LengthBytes: number;
      value: string;
    };
    payload: string;
    signature: string;
    state_init?: string;
  };
}