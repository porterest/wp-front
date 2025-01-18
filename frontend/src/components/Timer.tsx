import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDataPrefetch } from "../context/DataPrefetchContext";

interface TimerProps {
  onTimerEnd: () => void; // Callback при завершении таймера
  className?: string; // Дополнительный класс для стилизации
}

const Timer: React.FC<TimerProps> = ({ onTimerEnd, className = "" }) => {
  const { data, setData } = useDataPrefetch(); // Используем контекст
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Синхронизация времени и запуск таймера
  const syncAndStartTimer = useCallback(async () => {
    try {
      const timeData = data.time; // Берем `time` из контекста
      if (!timeData) {
        console.warn("Время не найдено в контексте");
        return;
      }

      const remainingTime = parseInt(timeData) * 1000; // перевод в миллисекунды
      console.log("Remaining time:", remainingTime);

      if (remainingTime === 0) {
        console.log("Получено 0, ждём 5 секунд и повторяем запрос...");
        setTimeout(syncAndStartTimer, 5000);
        return;
      }

      setTimeLeft(remainingTime);

      // Обновляем `time` в контексте
      setData({
        ...data, // сохраняем остальные поля из контекста
        time: (remainingTime / 1000).toString(), // Преобразуем в строку для соответствия интерфейсу
      });
    } catch (error) {
      console.error("Ошибка синхронизации времени в Timer:", error);
    }
  }, [data, setData]);

  useEffect(() => {
    syncAndStartTimer();
  }, [syncAndStartTimer]);

  // Обновляем оставшееся время каждую секунду
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? Math.max(prev - 1000, 0) : null));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Обрабатываем событие завершения таймера
  useEffect(() => {
    if (timeLeft === 0) {
      onTimerEnd();
      syncAndStartTimer();
    }
  }, [timeLeft, onTimerEnd, syncAndStartTimer]);

  // Форматируем оставшееся время в "мин:сек"
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`w-full p-2 bg-gradient-to-r from-[#40E0D0] to-[#8A2BE2] text-white rounded-b-md text-center ${className}`}
    >
      {timeLeft !== null ? (
        <p>Время до конца блока: {formatTime(timeLeft)}</p>
      ) : (
        <p>Загрузка...</p>
      )}
    </div>
  );
};

export default Timer;
