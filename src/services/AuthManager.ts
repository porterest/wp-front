import { apiClient } from "./apiClient"; // Импорт API-клиента для отправки запросов к бэкенду.

interface User {
    id: string;
    name: string;
    // ... другие поля
}

interface ProofData {
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

// Класс AuthManager отвечает за управление авторизацией и взаимодействие с пользователем.
export class AuthManager {
    private user: User | null = null; // Переменная для хранения текущего авторизованного пользователя.

    /**
     * Авторизация с использованием "proof".
     * @param proofData - Данные для проверки подлинности, полученные от TonConnect.
     * @returns Информация о пользователе.
     */
    async loginWithProof(proofData: ProofData): Promise<User> {
        try {
            console.log("[AuthManager]: Starting loginWithProof with proofData:", proofData);

            // Отправляет proofData на сервер для проверки подлинности.
            const response = await apiClient.post("/auth/verify_payload", proofData);
            console.log("[AuthManager]: Server response:", response);

            // После проверки сервер устанавливает cookies с токенами.
            const user = await this.getUser(); // Загружает информацию о текущем пользователе.
            console.log("[AuthManager]: User fetched after login:", user);

            if (!user) {
                throw new Error("Failed to fetch user after login."); // Ошибка, если пользователь не загружен.
            }
            this.user = user; // Сохраняет данные о пользователе в локальной переменной.
            return user; // Возвращает информацию о пользователе.
        } catch (error) {
            console.error("[AuthManager]: Error in loginWithProof:", error);
            throw error; // Пробрасываем ошибку для обработки на уровне компонента.
        }
    }

    /**
     * Обновление токена аутентификации.
     */
    async refreshToken(): Promise<void> {
        try {
            console.log("[AuthManager]: Refreshing token...");

            // Проверяет наличие токена в cookies
            if (!document.cookie.includes("widepiper-token")) {
                console.log("[AuthManager]: Token cookie not found.");
                return; // Завершает выполнение, если токен не найден.
            }

            await apiClient.post("/auth/refresh"); // Отправляет запрос на обновление токена.
            console.log("[AuthManager]: Token refreshed successfully.");
        } catch (error) {
            console.error("[AuthManager]: Failed to refresh token:", error);
            throw error; // Пробрасываем ошибку для возможной обработки выше.
        }
    }

    /**
     * Выход из системы.
     */
    async logout(): Promise<void> {
        try {
            console.log("[AuthManager]: Logging out...");
            await apiClient.post("/auth/logout"); // Отправляет запрос на разлогинивание пользователя.
        } catch (error) {
            console.warn("[AuthManager]: Logout request failed:", error);
        } finally {
            this.user = null; // Очищает информацию о текущем пользователе.
            console.log("[AuthManager]: User state cleared after logout.");
        }
    }

    /**
     * Получение текущего пользователя.
     * @returns Объект пользователя или null, если пользователь не найден.
     */
    async getUser(): Promise<User | null> {
        try {
            console.log("[AuthManager]: Fetching current user...");
            const response = await apiClient.get("/user"); // Запрос на получение информации о текущем пользователе.
            console.log("[AuthManager]: User fetched successfully:", response.data);
            return response.data as User; // Приводит ответ к типу User.
        } catch (error) {
            console.error("[AuthManager]: Failed to fetch user:", error);
            return null; // Возвращает null, если произошла ошибка.
        }
    }

    /**
     * Получение текущего авторизованного пользователя из локального состояния.
     * @returns Объект пользователя или null, если пользователь не найден.
     */
    getCurrentUser(): User | null {
        console.log("[AuthManager]: Returning locally stored user:", this.user);
        return this.user; // Возвращает локально сохранённого пользователя.
    }
}
