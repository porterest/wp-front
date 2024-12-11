import React, { createContext, useContext, useEffect, useReducer } from "react";
import { AuthManager } from "../services/AuthManager";
import { setLogoutFunction, setRefreshTokenFunction } from "../services/apiClient";

// Интерфейс для пользователя
interface User {
    id: string;
    name: string;
}

// Интерфейс контекста
interface AuthContextValue {
    isAuthenticated: boolean;
    user: User | null;
    loginWithProof: (proofData: any) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

// Начальное значение контекста
const AuthContext = createContext<AuthContextValue>({
    isAuthenticated: false,
    user: null,
    loginWithProof: async () => {},
    logout: async () => {},
    refreshUser: async () => {},
});

let authManager: AuthManager;

// Типы для состояния
interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
}

type AuthAction =
    | { type: "LOGIN"; payload: User }
    | { type: "LOGOUT" }
    | { type: "SET_USER"; payload: User | null };

// Редьюсер для управления состоянием
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
    switch (action.type) {
        case "LOGIN":
            return { isAuthenticated: true, user: action.payload };
        case "LOGOUT":
            return { isAuthenticated: false, user: null };
        case "SET_USER":
            return { isAuthenticated: !!action.payload, user: action.payload };
        default:
            return state;
    }
};

interface AuthProviderProps {
    children: React.ReactNode;
}

/**
 * Провайдер аутентификации
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, {
        isAuthenticated: false,
        user: null,
    });

    useEffect(() => {
        authManager = new AuthManager();

        // Настраиваем обновление токенов и выход
        setRefreshTokenFunction(() => authManager.refreshToken());
        setLogoutFunction(async () => {
            await authManager.logout();
            dispatch({ type: "LOGOUT" });
        });

        // Проверяем текущего пользователя при загрузке
        authManager.getUser().then((user) => {
            if (user) {
                dispatch({ type: "SET_USER", payload: user });
            }
        });
    }, []);

    /**
     * Вход с использованием proof
     */
    const loginWithProof = async (proofData: any) => {
        try {
            const user = await authManager.loginWithProof(proofData);
            dispatch({ type: "LOGIN", payload: user });
        } catch (error) {
            console.error("[AuthContext]: Login with proof failed:", error);
            throw error;
        }
    };

    /**
     * Выход из системы
     */
    const logout = async () => {
        try {
            await authManager.logout();
            dispatch({ type: "LOGOUT" });
        } catch (error) {
            console.error("[AuthContext]: Logout failed:", error);
        }
    };

    /**
     * Обновление пользователя
     */
    const refreshUser = async () => {
        try {
            const user = await authManager.getUser();
            dispatch({ type: "SET_USER", payload: user });
        } catch (error) {
            console.error("[AuthContext]: Failed to refresh user:", error);
        }
    };

    const value: AuthContextValue = {
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        loginWithProof,
        logout,
        refreshUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Хук для использования контекста аутентификации
 */
export const useAuth = () => useContext(AuthContext);
