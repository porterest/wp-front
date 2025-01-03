import axios from "axios";
import {
    DepositResponse,
    PairResponse,
    PlaceBetRequest,
    StatusResponse,
    UserBetsResponse,
    UserHistoryResponse
} from "../types/apiTypes";
import { BetStatusResponse, TimeResponse } from "../types/apiTypes";
import getPreviousBetEnd from "../pages/GamePage";

// Базовый URL для API
const BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "https://abchaaa.duckdns.org";

// Создаем экземпляр axios
export const apiClient = axios.create({
    baseURL: BASE_URL,
});

// Перехватчик для автоматической установки токена
apiClient.interceptors.request.use(
  (config) => {
      const token = localStorage.getItem("authToken");
      if (token) {
          config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
  },
  (error) => Promise.reject(error),
);

// Получение ставок пользователя
export async function getUserBets(): Promise<UserBetsResponse> {
    try {
        const response = await apiClient.get<UserBetsResponse>("/user/bets");
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
        const response = await apiClient.post<void>("/bet", data);
        return response.data;
    } catch (error) {
        console.error("Error placing bet:", error);
        throw error;
    }
}

export async function cancelBet(betId: string) {
    try {
        const response = await apiClient.post(`/bet/cancel`, { bet_id: betId });
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

export async function fetchUserBalances(): Promise<any> {
    try {
        const response = await apiClient.get("/user/info");
        return response.data;
    } catch (error) {
        console.error("Failed to fetch user balances:", error);
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
        const response = await apiClient.get<TimeResponse>("/chain/time");
        return response.data;
    } catch (error: any) {
        console.error("Ошибка получения времени:", error);

        if (error.response) {
            console.error("Ошибка сервера:", error.response.data);
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
    } catch (error: any) {
        console.error("Ошибка получения статусов ставок:", error);

        if (error.response) {
            console.error("Ошибка сервера:", error.response.data);
        }

        throw error;
    }
}


export async function check_user_deposit(): Promise<void> {
    try {
        await apiClient.get("/deposit");
    } catch (error: any) {
        console.error("Ошибка получения баланса:", error);

        if (error.response) {
            console.error("Ошибка сервера:", error.response.data);
        }

        throw error;
    }
}


export async function fetchPreviousBetEnd(pairId: string): Promise<{ x: number; y: number }> {
    try {
        const response = await apiClient.get<{ x: number; y: number }>(
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



