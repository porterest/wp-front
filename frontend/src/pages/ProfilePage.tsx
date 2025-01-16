import React, { useState, useEffect } from "react";
import { useTonConnectUI } from "@tonconnect/ui-react"; // Для работы с TonConnect UI
import { getUserBets, getUserHistory } from "../services/api"; // Импорт функций для выполнения запросов к API
import { BetResponse, TransactionResponse } from "../types/apiTypes"; // Типы данных для типизации ответов API
import { cancelBet } from "../services/api";
// import {UUID} from "node:crypto";

const ProfilePage: React.FC = () => {
  // Статические данные (адреса депозита и вознаграждений)
  const depositAddress = process.env.REACT_APP_DEPOSIT_ADDRESS || "";
  const rewardAddress = process.env.REACT_APP_REWARD_ADDRESS || "";

  // Подключение TonConnect UI для управления кошельком
  const [tonConnectUI] = useTonConnectUI();

  // Локальный стейт для управления вкладками (история ставок или транзакций)
  const [activeTab, setActiveTab] = useState<"bets" | "transactions">("bets");

  // Локальный стейт для хранения данных
  const [bets, setBets] = useState<BetResponse[]>([]); // Данные ставок
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]); // Данные транзакций

  // Локальный стейт для управления загрузкой и ошибками
  const [loading, setLoading] = useState<boolean>(true); // Состояние загрузки
  const [error, setError] = useState<string | null>(null); // Сообщение об ошибке

  // Эффект для загрузки данных при переключении вкладок
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true); // Устанавливаем состояние загрузки
        setError(null); // Сбрасываем ошибки

        if (activeTab === "bets") {
          // Если активна вкладка ставок, загружаем ставки
          const betsData = await getUserBets();
          setBets(betsData.bets); // Сохраняем данные ставок
        } else {
          // Если активна вкладка транзакций, загружаем транзакции
          const transactionsData = await getUserHistory();
          setTransactions(transactionsData.transactions); // Сохраняем данные транзакций
        }
      } catch (err) {
        console.error(err); // Логируем ошибку в консоль
        setError("Failed to load data. Please try again."); // Устанавливаем сообщение об ошибке
      } finally {
        setLoading(false); // Выключаем состояние загрузки
      }
    };

    fetchData(); // Вызываем функцию загрузки данных
  }, [activeTab]); // Выполняем эффект при смене активной вкладки

  // Функция для копирования текста в буфер обмена
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text); // Копируем текст
    alert("Address copied to clipboard!"); // Показываем уведомление
  };

  // Функция для изменения кошелька
  const changeWallet = async () => {
    try {
      await tonConnectUI.disconnect(); // Отключаем текущий кошелек
      alert("Wallet disconnected. Please connect a new wallet."); // Показываем сообщение

      await tonConnectUI.openModal(); // Открываем модальное окно для подключения нового кошелька
    } catch (error) {
      console.error("Failed to change wallet:", error); // Логируем ошибку
      alert("Failed to change wallet. Please try again."); // Показываем сообщение об ошибке
    }
  };

  const [isCanceling, setIsCanceling] = useState<boolean>(false);

  const handleCancelBet = async (betId: BetResponse) => {
    if (!window.confirm("Вы уверены, что хотите отменить ставку?")) return;
    console.log("betid is canceling", betId);
    setIsCanceling(true);
    try {
      await cancelBet(betId.bet_id.toString());
      setBets((prevBets) => prevBets.filter((bet) => bet.bet_id !== betId.bet_id));
      alert("Ставка успешно отменена.");
    } catch (error) {
      console.error("Ошибка при отмене ставки:", error);
      alert("Не удалось отменить ставку. Попробуйте снова.");
    } finally {
      setIsCanceling(false);
    }
  };

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
        {/* Кнопка для отображения истории ставок */}
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

        {/* Кнопка для отображения истории транзакций */}
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

      {/* Контент: либо история ставок, либо транзакций */}
      <section className="w-11/12 bg-gray-800 rounded-md shadow-lg p-6 space-y-4">
        {/* Если данные загружаются, показываем сообщение */}
        {loading ? (
          <p className="text-center text-gray-400">Loading...</p>
        ) : error ? (
          // Если есть ошибка, показываем сообщение об ошибке
          <p className="text-center text-red-500">{error}</p>
        ) : activeTab === "bets" ? (
          // Если активна вкладка ставок, отображаем список ставок
          <ul>
            {bets.map((bet) => (
              <li key={bet.bet_id} className="p-2 border-b border-gray-700">
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
                {/*<button*/}
                {/*    onClick={() => handleCancelBet(bet.bet_id)}*/}
                {/*    className="w-full py-2 bg-red-600 text-white font-bold rounded-md hover:bg-red-500 transition-colors duration-300 mt-2"*/}
                {/*>*/}
                {/*  Отменить*/}
                {/*</button>*/}
                <button
                  onClick={() => handleCancelBet(bet)}
                  disabled={isCanceling}
                  className={`w-full py-2 ${isCanceling ? "bg-gray-500 cursor-not-allowed" : "bg-red-600 hover:bg-red-500"} text-white font-bold rounded-md transition-colors duration-300 mt-2`}
                >
                  {isCanceling ? "Отмена..." : "Отменить"}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          // Если активна вкладка транзакций, отображаем список транзакций
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
                {/* Если есть tx_id, отображаем его */}
                {transaction.tx_id && (
                  <p>
                    <strong>Transaction ID:</strong> {transaction.tx_id}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ProfilePage;
