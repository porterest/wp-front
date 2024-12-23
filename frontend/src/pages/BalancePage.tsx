import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useTonWallet,
  TonConnectButton,
  useTonConnectUI,
} from "@tonconnect/ui-react";
import { apiClient } from "../services/apiClient";
import {fetchUserBalances} from "../services/api"; // Используем для запросов к бэкенду

const BalancePage: React.FC = () => {
  const [tonConnectUI] = useTonConnectUI(); // TonConnect API
  const [userData, setUserData] = useState<{
    balances: Record<string, number>;
    totalBalance: number;
    atRisk: number;
  } | null>(null); // Состояние для данных пользователя
  const [loading, setLoading] = useState(false); // Состояние загрузки
  const [error, setError] = useState<string | null>(null); // Состояние ошибок
  const [menuOpen, setMenuOpen] = useState(false); // Состояние выпадающего меню

  /**
   * Загружаем данные балансов пользователя с бэкенда
   */
// Функция для получения данных о балансе пользователя
  const loadUserData = async () => {
    console.log("HEEEEY");
    setLoading(true);
    setError(null);

    console.log("loading set to true");

    try {
      console.log("fetching user data");
      const data = await fetchUserBalances();
      console.log("жопа");
      setUserData(data); // Обновляем данные пользователя
    } catch (err) {
      console.error("Error fetching user balances:", err);
      setError("Failed to load user data. Please try again."); // Устанавливаем сообщение об ошибке
    } finally {
      console.log("setting loading to false");
      setLoading(false); // Завершаем загрузку
    }
  };

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    loadUserData();
  }, []);
  /**
   * Копирование адреса кошелька
   */
  const handleCopyAddress = async () => {
    if (!tonConnectUI.wallet) {
      console.error("Wallet is not connected.");
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(
          tonConnectUI.wallet.account.address,
        );
        alert("Wallet address copied to clipboard!");
      } else {
        console.error("Clipboard API not supported");
      }
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  /**
   * Отключение кошелька
   */
  const navigate = useNavigate();
  const handleDisconnect = async () => {
    try {
      await tonConnectUI.disconnect(); // Отключаем кошелек
      console.log("Wallet disconnected successfully");
    } catch (error) {
      console.error("Error during wallet disconnection:", error);
    }
    setMenuOpen(false); // Закрываем меню
    navigate("/home");
  };

  let content;

  if (loading) {
    content = <p className="text-gray-500">Loading risk data...</p>;
  } else if (error) {
    content = <p className="text-red-500">{error}</p>;
  } else if (userData) {
    content = <p className="text-xl font-extrabold">{userData.atRisk} USDT</p>;
  } else {
    content = <p className="text-gray-500">No risk data available.</p>;
  }

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
          <ul className="space-y-2 text-sm">
            {Object.entries(userData.balances).map(([token, amount]) => (
              <li key={token}>
                <span className="font-bold text-white">{amount}</span> {token}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xl font-extrabold">
            {userData.totalBalance} total in USDT
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

        {/* Кнопка подключения */}
        <div className="flex justify-center items-center">
          {!tonConnectUI.wallet ? (
            <div className="flex justify-center">
              <TonConnectButton />
            </div>
          ) : (
            <div className="relative inline-block">
              {/* Адрес кошелька */}
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="rounded-lg px-4 py-2 bg-teal-500 text-white font-semibold shadow-md hover:bg-teal-600 transition-all duration-300 flex items-center"
              >
                {tonConnectUI.wallet.account.address.slice(0, 6)}...
                {tonConnectUI.wallet.account.address.slice(-4)}
              </button>

              {/* Меню */}
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
        {content}
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
