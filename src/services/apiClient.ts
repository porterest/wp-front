import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

// Типы для функций
type RefreshTokenFunction = () => Promise<void>;
type LogoutFunction = () => void;

// Локальные переменные для токенов
let refreshTokenFunction: RefreshTokenFunction | null = null;
let logoutFunction: LogoutFunction | null = null;

/**
 * Устанавливает функцию для обновления токенов.
 * @param fn - Функция, которая обновляет токен
 */
export function setRefreshTokenFunction(fn: RefreshTokenFunction): void {
    refreshTokenFunction = fn;
}

/**
 * Устанавливает функцию для выполнения выхода из системы.
 * @param fn - Функция, которая выполняет выход из системы
 */
export function setLogoutFunction(fn: LogoutFunction): void {
    logoutFunction = fn;
}

// Определяем базовый URL с учетом окружения
const BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://a0da-2a12-5940-76ab-00-2.ngrok-free.app";

// Создаем экземпляр axios
export const apiClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        "ngrok-skip-browser-warning": true,
    },
});

/**
 * Перехватчик ответов (response interceptor)
 */
apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
        console.log("[API SUCCESS]:", response.config.url, response); // Лог успешного ответа
        return response;
    },
    async (error: AxiosError) => {
        console.error("[API ERROR]:", error.config?.url, error); // Лог ошибки

        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Если токен истек (401) и запрос не был повторен ранее
        if (error.response?.status === 401 && !originalRequest._retry && refreshTokenFunction) {
            originalRequest._retry = true;

            try {
                console.log("[API]: Refreshing token...");
                await refreshTokenFunction(); // Обновляем токен
                return apiClient(originalRequest); // Повторяем запрос
            } catch (refreshError) {
                console.error("[API ERROR]: Failed to refresh token:", refreshError);

                // Если обновление токенов не удалось, выполняем разлогинивание
                if (logoutFunction) {
                    console.warn("[API]: Logging out due to failed token refresh.");
                    logoutFunction();
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error); // Пропускаем ошибку дальше
    }
);
