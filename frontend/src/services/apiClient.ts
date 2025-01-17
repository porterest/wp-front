import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { InternalAxiosRequestConfig } from "axios";

// Типы для функций
type RefreshTokenFunction = () => Promise<string>; // Возвращает новый токен
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
const BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "https://abchaaa.duckdns.org";

// Создаем экземпляр axios
export const apiClient = axios.create({
  baseURL: BASE_URL,
});

// Устанавливаем заголовок Authorization из localStorage
function setAuthHeader() {
  const token = localStorage.getItem("authToken");
  if (token) {
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common["Authorization"];
  }
}

// Устанавливаем токен при инициализации
setAuthHeader();

/**
 * Перехватчик запросов (request interceptor)
 */

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

    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Если токен истек (401) и запрос не был повторен ранее
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      refreshTokenFunction
    ) {
      originalRequest._retry = true;

      try {
        console.log("[API]: Refreshing token...");
        const newToken = await refreshTokenFunction(); // Получаем новый токен
        localStorage.setItem("authToken", newToken); // Сохраняем в localStorage
        setAuthHeader(); // Устанавливаем новый токен в заголовок

        return apiClient(originalRequest); // Повторяем запрос с новым токеном
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
  },
);
