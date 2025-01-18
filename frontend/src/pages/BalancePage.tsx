import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TonConnectButton, useTonConnectUI } from "@tonconnect/ui-react";
import { check_user_deposit, fetchUserBalances } from "../services/api";
import { UserInfo } from "../types/user";

// ===== Контекст для балансов пользователя =====

interface UserBalanceContextProps {
  userData: UserInfo | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  // Если reloadUserData не используется, можно закомментировать или удалить ее:
  // reloadUserData: () => void;
}

const UserBalanceContext = createContext<UserBalanceContextProps | undefined>(undefined);

export const UserBalanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserBalances();
      setUserData(data);
    } catch (err) {
      console.error("Error fetching user balances:", err);
      setError("Failed to load user data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <UserBalanceContext.Provider value={{ userData, loading, error, reload }}>
      {children}
    </UserBalanceContext.Provider>
  );
};

export const useUserBalance = () => {
  const context = useContext(UserBalanceContext);
  if (!context) {
    throw new Error("useUserBalance must be used within a UserBalanceProvider");
  }
  return context;
};

// ===== Компонент BalancePage =====

const BalancePage: React.FC = () => {
  const { userData, loading, error, reload } = useUserBalance();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const tonConnectUI = useTonConnectUI()[0];
  const navigate = useNavigate();

  useEffect(() => {
    reload();
  }, []);

  // Обработчик копирования адреса кошелька
  const handleCopyAddress = useCallback(async () => {
    if (!tonConnectUI.wallet) {
      console.error("Wallet is not connected.");
      return;
    }
    try {
      const walletAddress = tonConnectUI.wallet.account.address;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(walletAddress);
        alert("Wallet address copied to clipboard!");
        await check_user_deposit();
      } else {
        console.error("Clipboard API not supported");
      }
    } catch (error) {
      console.error("Failed to copy address or send request:", error);
    }
  }, [tonConnectUI]);

  // Обработчик отключения кошелька
  const handleDisconnect = useCallback(async () => {
    try {
      await tonConnectUI.disconnect();
      console.log("Wallet disconnected successfully");
    } catch (error) {
      console.error("Error during wallet disconnection:", error);
    }
    setMenuOpen(false);
    navigate("/home");
  }, [tonConnectUI, navigate]);

  // Функция для рендера баланса кошелька
  const renderWalletBalance = () => {
    if (loading) {
      return <p>Loading balances...</p>;
    }
    if (error) {
      return <p className="text-red-500">{error}</p>;
    }
    if (userData) {
      return (
        <>
          <p className="mt-4 text-xl font-extrabold">
            Balance: {userData.balance} WPT
          </p>
          <p className="mt-4 text-xl font-extrabold">
            At risk (total bets): {userData.atRisk} WPT
          </p>
        </>
      );
    }
    return <p>No balance data available.</p>;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-6 space-y-8">
      {/* Шапка */}
      <header className="text-center space-y-4">
        <h1 className="text-3xl font-extrabold">User Balance</h1>
        <p className="text-gray-400">
          Track your assets and manage your risks efficiently.
        </p>

        {/* Кнопка подключения или отображение кошелька */}
        <div className="flex justify-center items-center">
          {!tonConnectUI.wallet ? (
            <div className="flex justify-center">
              <TonConnectButton />
            </div>
          ) : (
            <div className="relative inline-block">
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="rounded-lg px-4 py-2 bg-teal-500 text-white font-semibold shadow-md hover:bg-teal-600 transition-all duration-300 flex items-center"
              >
                {tonConnectUI.wallet.account.address.slice(0, 6)}...
                {tonConnectUI.wallet.account.address.slice(-4)}
              </button>
              {menuOpen && (
                <div className="absolute mt-2 right-0 bg-gray-800 text-white text-sm rounded shadow-lg p-2">
                  <button
                    onClick={handleCopyAddress}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-700 rounded"
                  >
                    Copy Address
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-700 rounded"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Секция балансов */}
      <div className="w-full max-w-md bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Your Wallet Balance</h2>
        {renderWalletBalance()}
      </div>

      {/* Секция рисков */}
      <div className="w-full max-w-md bg-gradient-to-br from-teal-500 to-green-600 p-6 rounded-xl shadow-lg">
        <h2 className="text-lg font-semibold mb-4">At Risk</h2>
        {loading ? (
          <p className="text-gray-500">Loading risk data...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : userData ? (
          <p className="text-xl font-extrabold">{userData.atRisk} WPT</p>
        ) : (
          <p className="text-gray-500">No risk data available.</p>
        )}
      </div>

      {/* Навигация */}
      <footer className="w-full fixed bottom-0 bg-gray-800 py-4 shadow-lg">
        <nav className="flex justify-around text-sm">
          <Link
            to="/balance"
            className="text-center text-blue-400 transition-colors duration-200"
          >
            Balance
          </Link>
          <Link
            to="/game"
            className="text-center text-gray-300 hover:text-blue-400 transition-colors duration-200"
          >
            Bets
          </Link>
          <Link
            to="/profile"
            className="text-center text-gray-300 hover:text-blue-400 transition-colors duration-200"
          >
            Profile
          </Link>
        </nav>
      </footer>
    </div>
  );
};

export default BalancePage;
