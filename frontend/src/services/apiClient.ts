import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

const logout = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
};

const BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "https://abchaaa.duckdns.org";

export const apiClient = axios.create({
  baseURL: BASE_URL,
});

function setAuthHeader() {
  const token = localStorage.getItem("authToken");
  if (token) {
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common["Authorization"];
  }
}

setAuthHeader();

interface RefreshedTokens {
  accessToken: string,
  refreshToken: string,
}

async function refreshTokens() {
  const refreshToken = localStorage.getItem("refreshToken");
  const response = await apiClient.post<RefreshedTokens>('/auth/refresh/', {}, {
    headers: {
      'X-Refresh-Token': refreshToken,
    },
  });
  localStorage.setItem("authToken", response.data.accessToken);
  localStorage.setItem("refreshToken", response.data.refreshToken);
  setAuthHeader();
}

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

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log("[API SUCCESS]:", response.config.url, response);
    return response; // Return the successful response
  },
  async (error: AxiosError) => {
    console.error("[API ERROR]:", error.config?.url, error);

    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Check for 401 Unauthorized and ensure we haven't retried this request yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log("[API]: Refreshing token...");
        await refreshTokens();
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("[API ERROR]: Failed to refresh token:", refreshError);

        // Log the user out if the token refresh fails
        console.warn("[API]: Logging out due to failed token refresh.");
        logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error); // Pass other errors through
  }
);