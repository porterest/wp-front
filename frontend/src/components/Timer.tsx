import React, { useEffect, useState } from "react";
import { useDataPrefetch } from "../context/DataPrefetchContext";
import { fetchTime } from "../services/api";

interface TimerProps {
  onTimerEnd: () => void; // Callback при завершении таймера
  className?: string; // Дополнительный класс для стилизации
}
const Timer: React.FC<TimerProps> = ({ onTimerEnd }) => {
  const { data } = useDataPrefetch();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false); // Флаг синхронизации

  const syncAndStartTimer = async () => {
    if (isSyncing) return; // Избегаем повторной синхронизации
    setIsSyncing(true);

    try {
      const timeData = await fetchTime();
      // setData((prev) => ({ ...prev, time: timeData.remaining_time_in_block }));
      const remainingTime = (timeData.remaining_time_in_block || 0) * 1000; // Конвертируем в миллисекунды
      console.log("remaining time", remainingTime);

      if (remainingTime <= 0) {
        console.log("Получено 0, ждем 5 секунд и повторяем запрос...");
        setTimeout(syncAndStartTimer, 5000);
        setIsSyncing(false);
        return;
      }

      setTimeLeft(remainingTime);
    } catch (error) {
      console.error("Ошибка синхронизации времени:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncAndStartTimer();
  }, [data.time]);

  useEffect(() => {
    if (timeLeft === 0) {
      onTimerEnd();
      syncAndStartTimer();
    }
  }, [timeLeft]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? Math.max(prev - 1000, 0) : null));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-2 bg-gradient-to-r from-[#40E0D0] to-[#8A2BE2] text-white rounded-b-md text-center">
      {timeLeft !== null ? (
        <p>Время до конца блока: {formatTime(timeLeft)}</p>
      ) : (
        <p>Загрузка...</p>
      )}
    </div>
  );
};

export default Timer;
