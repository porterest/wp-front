// import { apiClient } from "./apiClient";
// import { ProofData } from "../types/tonProof";
// import { CheckProofResponse, User } from "../types/apiTypes";
// import { verifyPayload } from "./api"; // Импорт API-клиента для отправки запросов к бэкенду.
//
//
// // Класс AuthManager отвечает за управление авторизацией и взаимодействие с пользователем.
// export class AuthManager {
//   private user: User | null = null; // Переменная для хранения текущего авторизованного пользователя.
//
//   /**
//    * Авторизация с использованием "proof".
//    * @param proofData - Данные для проверки подлинности, полученные от TonConnect.
//    * @returns Объект с токенами и информацией о пользователе.
//    */
  // async loginWithProof(proofData: ProofData): Promise<CheckProofResponse> {
  //   try {
  //     console.log(
  //       "[AuthManager]: Starting loginWithProof with proofData:",
  //       proofData,
  //     );
  //
  //     // Отправляет proofData на сервер для проверки подлинности.
  //     const response = await verifyPayload(proofData);
  //     console.log("[AuthManager]: Server response:", response);
  //
  //     const { accessToken, refreshToken, user } = response;
  //     console.log("tokens ", accessToken, refreshToken);
  //
  //     // Сохраняем токены в localStorage
  //     localStorage.setItem("authToken", accessToken);
  //     localStorage.setItem("refreshToken", refreshToken);
  //
  //     this.user = user; // Сохраняет данные о пользователе в локальной переменной.
  //     return { accessToken, refreshToken, user }; // Возвращает токены и пользователя.
  //   } catch (error) {
  //     console.error("[AuthManager]: Error in loginWithProof:", error);
  //     throw error; // Пробрасываем ошибку для обработки на уровне компонента.
  //   }
  // }

  // /**
  //  * Обновление токена аутентификации.
  //  * @returns Новый accessToken.
  //  */
  // async refreshToken(): Promise<string> {
  //   try {
  //     console.log("[AuthManager]: Refreshing token...");
  //
  //     const oldRefreshToken = localStorage.getItem("refreshToken");
  //     if (!oldRefreshToken) {
  //       throw new Error("Refresh token is missing in localStorage.");
  //     }
  //
  //     const response = await apiClient.post("/auth/refresh", {
  //       refresh_token: oldRefreshToken,
  //     });
  //
  //     const { accessToken, refreshToken } = response.data;
  //
  //     // Сохраняем новый accessToken
  //     localStorage.setItem("authToken", accessToken);
  //     localStorage.setItem("refreshToken", refreshToken);
  //     console.log("[AuthManager]: Token refreshed successfully.");
  //
  //     return accessToken;
  //   } catch (error) {
  //     console.error("[AuthManager]: Failed to refresh token:", error);
  //     throw error; // Пробрасываем ошибку для возможной обработки выше.
  //   }
  // }

  // /**
  //  * Выход из системы.
  //  */
  // async logout(): Promise<void> {
  //   try {
  //     console.log("[AuthManager]: Logging out...");
  //     await apiClient.post("/auth/logout"); // Отправляет запрос на разлогинивание пользователя.
  //   } catch (error) {
  //     console.warn("[AuthManager]: Logout request failed:", error);
  //   } finally {
  //     this.user = null; // Очищает информацию о текущем пользователе.
  //     localStorage.removeItem("authToken");
  //     localStorage.removeItem("refreshToken");
  //     console.log("[AuthManager]: User state cleared after logout.");
  //   }
  // }
  //
  // /**
  //  * Получение текущего пользователя.
  //  * @returns Объект пользователя или null, если пользователь не найден.
  //  */
  // async getUser(): Promise<User | null> {
  //   return this.user;
  // }
// }
