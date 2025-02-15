import { AxiosError } from "axios";
import {
    BackendCandle,
    BetResponse, BetResult, CheckProofResponse,
    // BackendCandle,
    PairResponse,
    PlaceBetRequest, TonProofPayloadResponse,
    UserBetsResponse,
    UserHistoryResponse
} from "../types/apiTypes";
import { BetStatusResponse, TimeResponse } from "../types/apiTypes";
import { UserInfo } from "../types/user";
import { CandleData } from "../types/candles";
import { apiClient } from "./apiClient";
import { ProofData } from "../types/tonProof";

export async function getPayload(): Promise<TonProofPayloadResponse> {
    try {
        const response = await apiClient.get<TonProofPayloadResponse>('/auth/payload');
        return response.data;
    } catch (error) {
        console.error("Error fetching payload:", error);
        throw error;
    }
}

export async function verifyPayload(proof: ProofData): Promise<CheckProofResponse> {
    try {
        const response = await apiClient.post<CheckProofResponse>('/auth/verify_payload', proof);
        return response.data;
    } catch (error) {
        console.error("Error verifying payload:", error);
        throw error;
    }
}

// Получение ставок пользователя
export async function getUserBets(): Promise<UserBetsResponse> {
    try {
        const response = await apiClient.get<UserBetsResponse>("/user/bets");
        console.log('ставка юзера');
        console.log(response);
        return response.data;
    } catch (error) {
        console.error("Error fetching user bets:", error);
        throw error;
    }
}
export async function getLastUserBet(pair_id: string): Promise<BetResponse> {
    try {
        const response = await apiClient.post<BetResponse>("/user/last_bet", {
            pair_id: pair_id,
        });
        console.log('1 ставка юзера');
        console.log(response.data.vector);
        return response.data;
    } catch (error) {
        console.error("Error fetching user bets:", error);
        throw error;
    }
}

// Получение истории транзакций
export async function getUserHistory(): Promise<UserHistoryResponse> {
    try {
        const response = await apiClient.get<UserHistoryResponse>("/user/history");
        return response.data;
    } catch (error) {
        console.error("Error fetching user history:", error);
        throw error;
    }
}

// Функция для отправки ставки
export async function placeBet(data: PlaceBetRequest): Promise<void> {
    try {
        const response = await apiClient.post<void>("/bets/bet", data);
        return response.data;
    } catch (error) {
        console.error("Error placing bet:", error);
        throw error;
    }
}

export async function cancelBet(betId: string) {
    try {
        console.log("betid to cancel", betId);
        const response = await apiClient.post(`/bets/cancel`, { bet_id: betId });
        if (response.status === 200) {
            alert("Ставка успешно отменена.");
        } else {
            alert("Не удалось отменить ставку. Попробуйте снова.");
        }
    } catch (error) {
        console.error("Ошибка при отмене ставки:", error);
        alert("Произошла ошибка. Проверьте подключение к сети.");
    }
}

export async function fetchUserBalances(): Promise<UserInfo> {
    try {
        const response = await apiClient.get<UserInfo>("/user/info");
        return response.data;
    } catch (error) {
        console.error("Failed to fetch user balances:", error);
        throw error;
    }
}

export async function withdrawTokens(amount: number): Promise<void> {
    try {
        const response = await apiClient.post("/user/withdraw", { amount });
        if (response.status === 200) {
            console.log("Withdrawal successful");
        } else {
            console.warn("Unexpected response status:", response.status);
        }
    } catch (error) {
        console.error("Failed to withdraw tokens:", error);
        throw error;
    }
}

/**
 * Запрос на получение доступных пар
 */
export async function getPairs(): Promise<PairResponse[]> {
    try {
        const response = await apiClient.get("/pair");
        return response.data;
    } catch (error) {
        console.error("Не удалось получить список пар:", error);
        throw error;
    }
}


/**
 * Запрос текущего времени, блока и длительности
 */
export async function fetchTime(): Promise<TimeResponse> {
    try {
        console.log("fetching time");
        const response = await apiClient.get<TimeResponse>("/chain/time");
        console.log(response.data);
        return response.data;
    } catch (error: unknown) {
        console.error("Ошибка получения времени:", error);
        if (error instanceof AxiosError) {
            if (error.response) {
                console.error("Ошибка сервера:", error.response.data);
            }
        }
        throw error;
    }
}

/**
 * Запрос на получение статусов ставок
 */
export async function fetchBetStatuses(): Promise<BetStatusResponse> {
    try {
        const response = await apiClient.get<BetStatusResponse>("/bets/status");
        return response.data;
    } catch (error: unknown) {
        console.error("Ошибка получения статусов ставок:", error);
        if (error instanceof AxiosError) {
            if (error.response) {
                console.error("Ошибка сервера:", error.response.data);
            }

        }
        throw error;
    }
}


export async function check_user_deposit(): Promise<void> {
    try {
        await apiClient.get("/deposit");
    } catch (error: unknown) {
        console.error("Ошибка получения баланса:", error);
        if (error instanceof AxiosError) {
            if (error.response) {
                console.error("Ошибка сервера:", error.response.data);
            }
        }
        throw error;
    }
}


export async function fetchPreviousBetEnd(pairId: string): Promise<number[]> {
    try {
        const response = await apiClient.get<number[]>(
          "/block/last_vector",
          {
              params: {
                  pair_id: pairId
              }
          });
        return response.data; // Возвращаем данные с координатами
    } catch (error) {
        console.error("Ошибка загрузки предыдущей ставки:", error);
        throw error;
    }
}

export async function fetchLastVectors(pairId: string, count: number): Promise<Array<[number, number]>> {
    try {
        const response = await apiClient.get<[number, number][]>(
          "/block/last_vectors",
          {
              params: {
                  pair_id: pairId,
                  count: count
              }
          });
        return response.data; // Возвращаем данные с координатами
    } catch (error) {
        console.error("Ошибка загрузки предыдущих векторов:", error);
        throw error;
    }
}

export async function getUserBetResult(): Promise<BetResult> {
    try {
        const response = await apiClient.get<BetResult>("/user/result_bet");
        return response.data;
    } catch (error) {
        console.error("Error fetching bet result", error);
        throw error;
    }
}


/**
 * Запрос данных свечей с бекенда
 * @returns Список свечей в формате CandleData
 * @param pairId
 */
export async function fetchCandles(pairId: string): Promise<CandleData[]> {
    try {
        const n = 144;
        const response = await apiClient.get<BackendCandle[]>("/candles", {
            params: { pair_id: pairId, n: n },
        });

        console.log('свечи');
        console.log(response.data);

        return response.data.map((candle: BackendCandle) => {
            // Log each field of the candle
            console.log('Candle:', {
                open: candle.opening_price,
                close: candle.closing_price,
                high: candle.high_price,
                low: candle.low_price,
                volume: candle.volume,
                block_number: candle.block_number,
            });

            return {
                open: candle.opening_price,
                close: candle.closing_price,
                high: candle.high_price,
                low: candle.low_price,
                volume: candle.volume,
                block_number: candle.block_number,
            } as CandleData;
        });
    } catch (error) {
        console.error("Error fetching candle data:", error);
        throw error;
    }
    //     return [
    //         {
    //             open: 10,
    //             close: 5,
    //             high: 15,
    //             low: 2,
    //             volume: 5,
    //             block_number: 1
    //         },
    //         {
    //             open: 5,
    //             close: 7,
    //             high: 10,
    //             low: 2,
    //             volume: 7,
    //             block_number: 2
    //         },
    //         {
    //             open: 7,
    //             close: 12,
    //             high: 17,
    //             low: 4,
    //             volume: 3,
    //             block_number: 3
    //         },
    //         {
    //             open: 12,
    //             close: 18,
    //             high: 18,
    //             low: 10,
    //             volume: 2,
    //             block_number: 4
    //         },
    //         {
    //             open: 18,
    //             close: 10,
    //             high: 19,
    //             low: 8,
    //             volume: 9,
    //             block_number: 5
    //         },
    //     ]; //todo

}
