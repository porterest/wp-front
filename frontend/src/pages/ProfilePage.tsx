import React, { useCallback, useEffect, useState } from "react";
import {
  cancelBet,
  fetchUserBalances,
  getUserBets,
  getUserHistory,
  withdrawTokens,
} from "../services/api"; // Импорт функций для выполнения запросов к API
import { BetResponse, TransactionResponse } from "../types/apiTypes";
import { UUID } from "node:crypto";

const ProfilePage: React.FC = () => {
  // Статические данные (адреса депозита и вознаграждений)
  const depositAddress = process.env.REACT_APP_DEPOSIT_ADDRESS || "";

  // Локальный стейт для управления вкладками (история ставок или транзакций)
  const [activeTab, setActiveTab] = useState<"bets" | "transactions">("bets");

  // Локальные стейты для хранения данных
  const [bets, setBets] = useState<BetResponse[]>([]);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);

  // Локальное состояние для отмены ставки
  const [isCanceling, setIsCanceling] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0); // Состояние для хранения баланса
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0); // Сумма вывода
  const [loading, setLoading] = useState<boolean>(true); // Индикатор загрузки
  const [error, setError] = useState<string | null>(null); // Состояние ошибки
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false); // Индикатор выполнения вывода

  // Загрузка баланса пользователя
  useEffect(() => {
    const loadBalance = async () => {
      try {
        setLoading(true);
        const userInfo = await fetchUserBalances();
        setBalance(userInfo.balance);
      } catch (err) {
        console.error("Ошибка при загрузке баланса:", err);
        setError("Не удалось загрузить баланс.");
      } finally {
        setLoading(false);
      }
    };

    loadBalance();
  }, []);
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

  // Обработчик вывода средств
  const handleWithdraw = async () => {
    if (withdrawAmount <= 0 || withdrawAmount > balance) {
      alert("Введите корректную сумму для вывода.");
      return;
    }

    try {
      setIsWithdrawing(true);
      await withdrawTokens(withdrawAmount); // Отправка суммы на бэкенд
      setBalance((prevBalance) => prevBalance - withdrawAmount); // Обновление локального состояния баланса
      alert("Средства успешно выведены.");
    } catch (err) {
      console.error("Ошибка при выводе средств:", err);
      alert("Не удалось выполнить вывод. Попробуйте позже.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Функция для отмены ставки
  const handleCancelBet = useCallback(async (betId: UUID) => {
    const bet = bets.find((b) => b.id == betId);
    if (!bet || bet.status != "PENDING") {
      return;
    }
    if (!window.confirm("Вы уверены, что хотите отменить ставку?")) return;
    setIsCanceling(betId);
    try {
      await cancelBet(betId.toString());
      setBets((prevBets) => prevBets.filter((bet) => bet.id !== betId));
      alert("Ставка успешно отменена.");
    } catch (error) {
      console.error("Ошибка при отмене ставки:", error);
      alert("Не удалось отменить ставку. Попробуйте снова.");
    } finally {
      setIsCanceling(null);
    }
  }, []);

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
            <strong>Created At:</strong>{" "}
            {new Date(bet.created_at).toLocaleString()}
          </p>
          <button
            onClick={() => handleCancelBet(bet.id)}
            disabled={isCanceling === bet.id}
            className={`w-full py-2 ${
              bet.status === "CANCELED"
              ? "bg-gray-500 cursor-not-allowed"
              : isCanceling === bet.id
                ? "bg-gray-500 cursor-not-allowed"
                : bet.status === "PENDING" 
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-purple-600 cursor-not-allowed"
            } text-white font-bold rounded-md transition-colors duration-300 mt-2`
          }
          >
            {
              bet.status === "CANCELED"
                ? "Отменена"
                : isCanceling === bet.id
                  ? "Отмена..."
                  : bet.status === "PENDING"
                    ? "В обработке"
                    : "Учтена"
            }
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
    <div
      className="flex flex-col items-center justify-start min-h-screen bg-gradient-to-b from-black to-gray-900 text-white p-4 space-y-6 overflow-auto">
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

      {/* Баланс и вывод средств */}
      <section className="w-11/12 bg-gradient-to-r from-teal-600 to-teal-400 rounded-md shadow-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Your Balance</h2>
        {loading ? (
          <p className="text-center text-gray-400">Loading...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : (
          <>
            <p className="text-sm">Available balance: {balance} tokens</p>
            <input
              type="number"
              placeholder="Withdrawal amount"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              className="w-full py-2 px-4 rounded-md border border-gray-700 text-black"
            />
            <button
              onClick={handleWithdraw}
              disabled={
                isWithdrawing || withdrawAmount <= 0 || withdrawAmount > balance
              }
              className={`w-full py-2 ${
                isWithdrawing
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-teal-800 hover:bg-teal-700"
              } text-white font-bold rounded-md transition-colors duration-300`}
            >
              {isWithdrawing ? "Withdrawing..." : "Withdraw"}
            </button>
          </>
        )}
      </section>

      {/* Переключатель вкладок */}
      <div className="w-11/12 flex justify-center space-x-4 mt-6">
        <button
          onClick={() => setActiveTab("bets")}
          className={`py-2 px-4 rounded-md font-bold ${
            activeTab === "bets"
              ? "bg-purple-600 text-white"
              : "bg-gray-700 text-gray-400"
          }`}
        >
          Bets History
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`py-2 px-4 rounded-md font-bold ${
            activeTab === "transactions"
              ? "bg-teal-400 text-white"
              : "bg-gray-700 text-gray-400"
          }`}
        >
          Transactions History
        </button>
      </div>

      {/* Контент: история ставок или транзакций */}
      <section className="w-11/12 bg-gray-800 rounded-md shadow-lg p-6 space-y-4 overflow-y-auto max-h-[50vh]">
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
