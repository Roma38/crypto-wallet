export interface TXRef {
  block_height: number;
  confirmations: number;
  confirmed: string;
  double_spend: boolean;
  ref_balance: number;
  spent: boolean;
  tx_hash: string;
  tx_input_n: number;
  tx_output_n: number;
  value: number;
}

export interface WalletInfoResponse {
  address: string;
  balance: number;
  final_balance: number;
  final_n_tx: number;
  n_tx: number;
  total_received: number;
  total_sent: number;
  tx_url: string;
  txrefs: TXRef[];
  unconfirmed_txrefs?: TXRef[];
  unconfirmed_balance: number;
  unconfirmed_n_tx: number;
}