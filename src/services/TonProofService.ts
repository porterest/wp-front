import { apiClient } from "./apiClient";

// Интерфейс для описания ответа сервера
interface TonProofPayloadResponse {
    payload: string;
}

export class TonProofService {
    /**
     * Получение TonProof payload от сервера
     * @returns строка payload, используемая для подключения TonConnect
     */
    static async getTonProofPayload(): Promise<string> {
        try {
            console.log("[TonProofService]: Fetching TonProof payload...");

            // Выполняем запрос к серверу
            const response = await apiClient.get<TonProofPayloadResponse>("/auth/payload");
            console.log("[TonProofService]: Payload fetched:", response.data.payload);

            // Возвращаем payload
            return response.data.payload;
        } catch (error) {
            console.error("[TonProofService]: Failed to fetch TonProof payload:", error);
            throw error; // Пробрасываем ошибку выше для обработки
        }
    }
}
