import React, { useState, useEffect, useCallback } from "react";
import { useTonConnectUI } from "@tonconnect/ui-react"; // Для работы с TonConnect UI
import { getUserBets, getUserHistory, cancelBet } from "../services/api"; // Импорт функций для выполнения запросов к API
import { BetResponse, TransactionResponse } from "../types/apiTypes";
import { UUID } from "node:crypto";

const ProfilePage: React.FC = () => {
  // Статические данные (адреса депозита и вознаграждений)
  const depositAddress = process.env.REACT_APP_DEPOSIT_ADDRESS || "";
  const rewardAddress = process.env.REACT_APP_REWARD_ADDRESS || "";

  // Подключение TonConnect UI для управления кошельком
  const [tonConnectUI] = useTonConnectUI();

  // Локальный стейт для управления вкладками (история ставок или транзакций)
  const [activeTab, setActiveTab] = useState<"bets" | "transactions">("bets");

  // Локальные стейты для хранения данных
  const [bets, setBets] = useState<BetResponse[]>([]);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);

  // Локальные стейты для управления загрузкой и ошибками
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Локальное состояние для отмены ставки
  const [isCanceling, setIsCanceling] = useState<boolean>(false);

  // Функция загрузки данных в зависимости от активной вкладки
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (activeTab === "bets") {
        const betsData = await getUserBets();
        setBets(betsData.bets);
      } else {
        const transactionsData = await getUserHistory();
        setTransactions(transactionsData.transactions);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Эффект для загрузки данных при переключении вкладок
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Функция копирования текста в буфер обмена
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    alert("Address copied to clipboard!");
  }, []);

  // Функция для изменения кошелька
  const changeWallet = useCallback(async () => {
    try {
      await tonConnectUI.disconnect(); // Отключаем текущий кошелек
      alert("Wallet disconnected. Please connect a new wallet.");
      await tonConnectUI.openModal(); // Открываем модальное окно для подключения нового кошелька
    } catch (error) {
      console.error("Failed to change wallet:", error);
      alert("Failed to change wallet. Please try again.");
    }
  }, [tonConnectUI]);

  // Функция для отмены ставки
  const handleCancelBet = useCallback(
    async (betId: UUID) => {
      if (!window.confirm("Вы уверены, что хотите отменить ставку?")) return;
      setIsCanceling(true);
      try {
        await cancelBet(betId.toString());
        setBets((prevBets) => prevBets.filter((bet) => bet.id !== betId));
        alert("Ставка успешно отменена.");
      } catch (error) {
        console.error("Ошибка при отмене ставки:", error);
        alert("Не удалось отменить ставку. Попробуйте снова.");
      } finally {
        setIsCanceling(false);
      }
    },
    []
  );

  // Функция для рендера списка ставок
  const renderBets = () => (
    <ul>
      {bets.map((bet) => (
        <li key={bet.id} className="p-2 border-b border-gray-700">
          <p>
            <strong>Pair:</strong> {bet.pair_name}
          </p>
          <p>
            <strong>Amount:</strong> {bet.amount}
          </p>
          <p>
            <strong>Created At:</strong> {new Date(bet.created_at).toLocaleString()}
          </p>
          <button
            onClick={() => handleCancelBet(bet.id)}
            disabled={isCanceling}
            className={`w-full py-2 ${
              isCanceling ? "bg-gray-500 cursor-not-allowed" : "bg-red-600 hover:bg-red-500"
            } text-white font-bold rounded-md transition-colors duration-300 mt-2`}
          >
            {isCanceling ? "Отмена..." : "Отменить"}
          </button>
        </li>
      ))}
    </ul>
  );

  // Функция для рендера списка транзакций
  const renderTransactions = () => (
    <ul>
      {transactions.map((transaction, index) => (
        <li key={index} className="p-2 border-b border-gray-700">
          <p>
            <strong>Type:</strong> {transaction.type}
          </p>
          <p>
            <strong>Sender:</strong> {transaction.sender}
          </p>
          <p>
            <strong>Recipient:</strong> {transaction.recipient}
          </p>
          <p>
            <strong>Amount:</strong> {transaction.amount}
          </p>
          {transaction.tx_id && (
            <p>
              <strong>Transaction ID:</strong> {transaction.tx_id}
            </p>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gradient-to-b from-black to-gray-900 text-white p-4 space-y-6">
      {/* Логотип */}
      <div className="mt-6">
        <img src="/logo.png" alt="Logo" className="w-40 h-20 shadow-lg" />
      </div>

      {/* Заголовок страницы */}
      <h1 className="text-2xl font-bold text-center">Profile</h1>
      <p className="text-gray-400 text-center">
        Manage your account, addresses, and settings.
      </p>

      {/* Адрес для пополнения */}
      <section className="w-11/12 bg-gradient-to-r from-purple-600 to-purple-400 rounded-md shadow-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Deposit Address</h2>
        <p className="text-sm break-words">{depositAddress}</p>
        <button
          onClick={() => copyToClipboard(depositAddress)}
          className="w-full py-2 bg-purple-800 text-white font-bold rounded-md hover:bg-purple-700 transition-colors duration-300"
        >
          Copy Address
        </button>
      </section>

      {/* Адрес для вознаграждений */}
      <section className="w-11/12 bg-gradient-to-r from-teal-600 to-teal-400 rounded-md shadow-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Reward Address</h2>
        <p className="text-sm break-words">{rewardAddress}</p>
        <button
          onClick={changeWallet}
          className="w-full py-2 bg-teal-800 text-white font-bold rounded-md hover:bg-teal-700 transition-colors duration-300"
        >
          Change Wallet
        </button>
      </section>

      {/* Переключатель вкладок */}
      <div className="w-11/12 flex justify-center space-x-4 mt-6">
        <button
          onClick={() => setActiveTab("bets")}
          className={`py-2 px-4 rounded-md font-bold ${
            activeTab === "bets" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-400"
          }`}
        >
          Bets History
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`py-2 px-4 rounded-md font-bold ${
            activeTab === "transactions" ? "bg-teal-400 text-white" : "bg-gray-700 text-gray-400"
          }`}
        >
          Transactions History
        </button>
      </div>

      {/* Контент: либо история ставок, либо транзакций */}
      <section className="w-11/12 bg-gray-800 rounded-md shadow-lg p-6 space-y-4">
        {loading ? (
          <p className="text-center text-gray-400">Loading...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : activeTab === "bets" ? (
          renderBets()
        ) : (
          renderTransactions()
        )}
      </section>
    </div>
  );
};

export default ProfilePage;
