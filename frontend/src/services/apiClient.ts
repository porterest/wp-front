import axios, { AxiosError } from "axios";
import createAuthRefreshInterceptor from "axios-auth-refresh";
// import { AxiosAuthRefreshRequestConfig } from 'axios-auth-refresh';

const BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "https://abchaaa.duckdns.org";

export const apiClient = axios.create({
  baseURL: BASE_URL,
});

interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
}

function getAccessToken(): string | null {
  return localStorage.getItem("authToken");
}

function getRefreshToken(): string | null {
  return localStorage.getItem("refreshToken");
}

// async function refreshTokens() {
//   const refreshToken = getRefreshToken();
//   console.log("refresh is", refreshToken);
//   const response = await apiClient
//   localStorage.setItem("authToken", response.data.accessToken);
//   localStorage.setItem("refreshToken", response.data.refreshToken);
// }

const refreshAuthLogic = (failedRequest: AxiosError) =>
  apiClient
    .post<RefreshedTokens>(
      "/auth/refresh",
      {},
      {
        headers: {
          "X-Refresh-Token": getRefreshToken(),
        },
        // skipAuthRefresh: true
      } // as AxiosAuthRefreshRequestConfig,
    )
    .then((tokenRefreshResponse) => {
      localStorage.setItem("authToken", tokenRefreshResponse.data.accessToken);
      localStorage.setItem(
        "refreshToken",
        tokenRefreshResponse.data.refreshToken,
      );
      failedRequest.response!.config.headers["Authorization"] =
        "Bearer " + tokenRefreshResponse.data.accessToken;
      return Promise.resolve();
    });

createAuthRefreshInterceptor(apiClient, refreshAuthLogic, {
  pauseInstanceWhileRefreshing: true,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);
//
// apiClient.interceptors.response.use(
//   (response: AxiosResponse) => {
//     console.log("[API SUCCESS]:", response.config.url, response);
//     return response; // Return the successful response
//   },
//   async (error: AxiosError) => {
//     console.error("[API ERROR]:", error.config?.url, error);
//     const originalRequest = error.config as AxiosRequestConfig & {
//       _retry?: boolean;
//     };
//
//     // Check for 401 Unauthorized and ensure we haven't retried this request yet
//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;
//
//       try {
//         console.log("[API]: Refreshing token...");
//         // await refreshTokens();
//         return await apiClient(originalRequest);
//       } catch (refreshError) {
//         console.error("[API ERROR]: Failed to refresh token:", refreshError);
//
//         // Log the user out if the token refresh fails
//         console.warn("[API]: Logging out due to failed token refresh.");
//         logout();
//         return Promise.reject(refreshError);
//       }
//     }
//
//     return Promise.reject(error); // Pass other errors through
//   },
// );
