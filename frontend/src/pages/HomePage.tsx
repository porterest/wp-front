import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TonConnectButton,
  useTonConnectUI,
  useTonWallet,
} from "@tonconnect/ui-react";
import { useDataPrefetch } from "../context/DataPrefetchContext";
import { fetchTime, getPairs, getPayload } from "../services/api";

const HomePage: React.FC = () => {
  // const { wallet, openTonConnectModal } = useTonConnectManager();
  // const { isAuthenticated, loginWithProof } = useAuth();
  const tonWallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setData } = useDataPrefetch();

  useEffect(() => {
    const fetchPairs = async (): Promise<void> => {
      try {
        const pairsResponse = await getPairs();

        if (!pairsResponse || !Array.isArray(pairsResponse)) {
          console.warn("Данные пар невалидны, повторный запрос через 5 секунд...");
          setTimeout(fetchPairs, 5000); // Повторяем запрос через 5 секунд
          return;
        }

        const pairs = pairsResponse.map((pair) => ({
          value: pair.pair_id,
          label: pair.name,
        }));
        console.log("pairs", pairs);
        setData((prev) => ({ ...prev, pairs })); // Обновляем только пары
      } catch (error) {
        console.error("Ошибка при загрузке пар:", error);
        setTimeout(fetchPairs, 5000); // Повторяем запрос через 5 секунд
      }
    };

    const fetchTimeData = async (): Promise<void> => {
      try {
        const timeResponse = await fetchTime();

        if (!timeResponse || timeResponse.remaining_time_in_block === 0) {
          console.warn("Данные времени невалидны, повторный запрос через 5 секунд...");
          setTimeout(fetchTimeData, 5000); // Повторяем запрос через 5 секунд
          return;
        }
        console.log("time", timeResponse);
        setData((prev) => ({ ...prev, time: timeResponse.remaining_time_in_block })); // Обновляем только время
      } catch (error) {
        console.error("Ошибка при загрузке времени:", error);
        setTimeout(fetchTimeData, 5000); // Повторяем запрос через 5 секунд
      }
    };

    // Функция для параллельного запуска обоих запросов
    const fetchData = (): void => {
      fetchPairs();
      fetchTimeData();
    };

    fetchData(); // Запускаем первый цикл запросов
  }, [setData]);


  // Проверка, если кошелек подключен, запускаем авторизацию
  useEffect(() => {
    // Устанавливаем состояние загрузки
    tonConnectUI.setConnectRequestParameters({ state: "loading" });
    const initTonConnect = async () => {
      try {
        const requestStorageAccess = async () => {
          if (document.requestStorageAccess) {
            try {
              await document.requestStorageAccess();
              console.log("Storage access granted!");
            } catch (error) {
              console.error("Storage access denied.", error);
            }
          } else {
            console.warn(
              "requestStorageAccess API is not supported in this browser.",
            );
          }
        };

        await requestStorageAccess();

        // Получаем tonProofPayload с бэкенда
        const tonProofPayload = await getPayload();

        if (tonProofPayload) {
          // Готовим параметры подключения с tonProof
          tonConnectUI.setConnectRequestParameters({
            state: "ready",
            value: { tonProof: tonProofPayload.payload },
          });
        } else {
          // Если proof не найден, убираем загрузку
          tonConnectUI.setConnectRequestParameters(null);
        }

      } catch (error) {
        console.error("[HomePage]: Error during initialization:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error occurred.",
        );
      } finally {
        setLoading(false);
      }
    };

    initTonConnect();
  }, []);

  const handlePlayNow = async () => {
    console.log("Play Now");
    setLoading(true);
    setError(null);

    if (tonWallet) {
      navigate("/game");
      return;
    }
    else {
      await tonConnectUI.openModal();
    }

    setLoading(false);
  };



  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-black text-white">
      {/* Логотип */}
      <div className="mt-10">
        <img src="/logo.png" alt="Widepiper Logo" className="w-40 h-20" />
      </div>

      {/* Приветствие */}
      <div className="text-center px-6 mt-2">
        <h2 className="text-2xl font-bold mb-3">Welcome to Widepiper!</h2>
        <p className="text-gray-300">
          Explore a new world of crypto gambling. Connect your wallet to get
          started.
        </p>
      </div>

      {/* Кнопки */}
      <div className="mt-4 mb-20 space-y-4 w-full px-6">
        {/* Ошибка */}
        {error && <p className="text-red-500">{error}</p>}

        {/* Кнопка TonConnect */}
        {!tonWallet && (
          <div className="flex justify-center mb-4">
            <TonConnectButton />
          </div>
        )}

        {/* Кнопка Play Now */}
        <button
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-400 rounded-lg text-white font-bold hover:opacity-90"
          onClick={handlePlayNow}
          disabled={loading}
        >
          {loading ? "Connecting..." : "Play Now"}
        </button>

        {/* Кнопка Learn More */}
        <button
          className="w-full py-3 bg-gray-800 border border-gray-600 rounded-lg text-white font-bold hover:bg-gray-700"
          onClick={() => window.open("https://widepiper.com/", "_blank")}
        >
          Learn More
        </button>
      </div>
    </div>
  );
};

export default HomePage;
