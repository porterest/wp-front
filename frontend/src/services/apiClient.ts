import axios, { AxiosError } from "axios";
import createAuthRefreshInterceptor from "axios-auth-refresh";

const BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "https://wp-dev-app.duckdns.org";

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

const refreshAuthLogic = (failedRequest: AxiosError) =>
  apiClient
    .post<RefreshedTokens>(
      "/auth/refresh",
      {},
      {
        headers: {
          "X-Refresh-Token": getRefreshToken(),
        },

      }
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
