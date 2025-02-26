// Тип для ответа с /user/bets
import { UUID } from "node:crypto";

export interface TonProofPayloadResponse {
  payload: string;
}

// export interface User {
//   id: string;
//   name: string;
// }

export interface CheckProofResponse {
  accessToken: string,
  refreshToken: string,
  // user: User
}

export interface BetResponse {
  id: UUID;
  amount: number;
  vector: BetVector; // Можно уточнить тип, если известно
  pair_name: string;
  status: BetStatus;
  created_at: string; // ISO-формат даты
}

export type BetStatus = "pending" | "resolved" | "canceled"; // Пример возможных значений

export type BetVector = [price: number, betsAmount: number];

export interface UserBetsResponse {
  user_id: string; // UUID
  bets: BetResponse[];
}

// Тип для ответа с /user/history
export type TransactionType = "deposit" | "withdraw"; // Добавьте свои типы транзакций

export interface TransactionResponse {
  type: TransactionType;
  sender: string;
  recipient: string;
  amount: number;
  tx_id?: string; // Опциональное поле
}

export interface UserHistoryResponse {
  user_id: string; // UUID
  transactions: TransactionResponse[];
}

export interface PlaceBetRequest {
  pair_id: string; // UUID
  amount: number;
  predicted_vector: number[];
}

export interface PairResponse {
  pair_id: string;
  name: string;
}

export interface TimeResponse {
  block_id: string;
  server_time: string; // Текущее серверное время
  current_block: number; // ID текущего блока
  remaining_time_in_block: number; // Оставшееся время в секундах
}

export interface BetStatusResponse {
  bets: {
    bet_id: string;
    // Статус ставки
    status: "frozen" | "result";
    // Название пары
    pair_name: string;
    // Результат (если завершено)
    result?: string;
  }[];
  // Длительность блока
  block_duration_seconds: number;
}

export interface DepositResponse {
  wallet_address: string;
  amount: number;
}
// Если BetStatus еще не описан

export interface BackendCandle {
  opening_price: number;
  closing_price: number;
  high_price: number;
  low_price: number;
  volume: number;
  block_number: number;
}

export interface BetResult {
  id: number;
  amount: number;
  pair_name: string;
  status: string;
  reward: number;
  accuracy: number;
  created_at: string;
}
