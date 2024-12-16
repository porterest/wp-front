// import React, { createContext, useContext, useEffect, useReducer } from "react";
// import { AuthManager } from "../services/AuthManager";
// import { setLogoutFunction, setRefreshTokenFunction } from "../services/apiClient";
// import { AuthActionType } from "../enums/AuthActionType";
//
// // Интерфейс для пользователя
// interface User {
//     id: string;
//     name: string;
// }
//
// // Интерфейс контекста
// interface AuthContextValue {
//     isAuthenticated: boolean;
//     user: User | null;
//     loginWithProof: (proofData: any) => Promise<void>;
//     logout: () => Promise<void>;
//     refreshUser: () => Promise<void>;
//     getCurrentUser: () => User | null; // Метод для получения текущего пользователя
// }
//
// // Начальное значение контекста
// const AuthContext = createContext<AuthContextValue>({
//     isAuthenticated: false,
//     user: null,
//     loginWithProof: async () => {},
//     logout: async () => {},
//     refreshUser: async () => {},
//     getCurrentUser: () => null,
// });
//
// let authManager: AuthManager;
//
// // Типы для состояния
// interface AuthState {
//     isAuthenticated: boolean;
//     user: User | null;
// }
//
// type AuthAction =
//     | { type: AuthActionType.LOGIN; payload: User }
//     | { type: AuthActionType.LOGOUT }
//     | { type: AuthActionType.SET_USER; payload: User | null };
//
//
// // Редьюсер для управления состоянием
// const authReducer = (state: AuthState, action: AuthAction): AuthState => {
//     switch (action.type) {
//         case AuthActionType.LOGIN:
//             return { isAuthenticated: true, user: action.payload };
//         case AuthActionType.LOGOUT:
//             return { isAuthenticated: false, user: null };
//         case AuthActionType.SET_USER:
//             return { isAuthenticated: !!action.payload, user: action.payload };
//         default:
//             return state;
//     }
// };
//
//
// interface AuthProviderProps {
//     children: React.ReactNode;
// }
//
// /**
//  * Провайдер аутентификации
//  */
// export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
//     const [state, dispatch] = useReducer(authReducer, {
//         isAuthenticated: false,
//         user: null,
//     });
//
//     useEffect(() => {
//         authManager = new AuthManager();
//
//         // Настраиваем обновление токенов и выход
//         setRefreshTokenFunction(() => authManager.refreshToken());
//         setLogoutFunction(async () => {
//             await authManager.logout();
//             dispatch({ type: AuthActionType.LOGOUT });
//         });
//
//         // Проверяем текущего пользователя при загрузке
//         authManager.getUser().then((user) => {
//             if (user) {
//                 dispatch({ type: AuthActionType.SET_USER, payload: user });
//             }
//         });
//     }, []);
//
//     /**
//      * Вход с использованием proof
//      */
//     const loginWithProof = async (proofData: any) => {
//         try {
//             const user = await authManager.loginWithProof(proofData);
//             dispatch({ type: AuthActionType.LOGIN, payload: user });
//         } catch (error) {
//             console.error("[AuthContext]: Login with proof failed:", error);
//             throw error;
//         }
//     };
//
//     /**
//      * Выход из системы
//      */
//     const logout = async () => {
//         try {
//             await authManager.logout();
//             dispatch({ type: AuthActionType.LOGOUT });
//         } catch (error) {
//             console.error("[AuthContext]: Logout failed:", error);
//         }
//     };
//
//     /**
//      * Обновление пользователя
//      */
//     const refreshUser = async () => {
//         try {
//             const user = await authManager.getUser();
//             dispatch({ type: AuthActionType.SET_USER, payload: user });
//         } catch (error) {
//             console.error("[AuthContext]: Failed to refresh user:", error);
//         }
//     };
//
//     /**
//      * Получение текущего пользователя из контекста
//      */
//     const getCurrentUser = (): User | null => {
//         return state.user;
//     };
//
//     const value: AuthContextValue = {
//         isAuthenticated: state.isAuthenticated,
//         user: state.user,
//         loginWithProof,
//         logout,
//         refreshUser,
//         getCurrentUser,
//     };
//
//     return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// };
//
// /**
//  * Хук для использования контекста аутентификации
//  */
// export const useAuth = () => useContext(AuthContext);
import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthManager } from "../services/AuthManager";
import {
  setLogoutFunction,
  setRefreshTokenFunction,
} from "../services/apiClient";

interface User {
  id: string;
  name: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  user: User | null;
  loginWithProof: (proofData: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getCurrentUser: () => User | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const authManager = new AuthManager();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const currentUser = await authManager.getUser();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } catch {
        setUser(null);
        setIsAuthenticated(false);
      }
    };

    setRefreshTokenFunction(() => authManager.refreshToken());
    setLogoutFunction(async () => {
      await authManager.logout();
      setUser(null);
      setIsAuthenticated(false);
    });

    initializeAuth();
  }, []);

  const loginWithProof = async (proofData: any) => {
    try {
      const loggedInUser = await authManager.loginWithProof(proofData);
      setUser(loggedInUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("[AuthContext]: Login with proof failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authManager.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("[AuthContext]: Logout failed:", error);
    }
  };

  const refreshUser = async () => {
    try {
      const updatedUser = await authManager.getUser();
      setUser(updatedUser);
    } catch (error) {
      console.error("[AuthContext]: Failed to refresh user:", error);
    }
  };

  const getCurrentUser = (): User | null => user;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loginWithProof,
        logout,
        refreshUser,
        getCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
