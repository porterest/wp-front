import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDataPrefetch } from "../context/DataPrefetchContext";
import { TimeResponse } from "../types/apiTypes";

interface TimerProps {
  onTimerEnd: () => void; // Callback при завершении таймера
  className?: string; // Дополнительный класс для стилизации
}

const Timer: React.FC<TimerProps> = ({ onTimerEnd, className = "" }) => {
  const { data, setData } = useDataPrefetch();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Синхронизация времени
  const syncAndStartTimer = useCallback(async () => {
    try {
      const timeData = data.time as TimeResponse | undefined;
      if (!timeData) {
        console.warn("Время не найдено в контексте");
        return;
      }
      console.log("timeData");
      console.log(timeData);

      if (typeof timeData !== "number" || timeData <= 0) {
        console.warn("Некорректное значение времени:", timeData);
        return;
      }

      const remainingTime = timeData * 1000; // переводим в миллисекунды
      // console.log("Remaining time (ms):", remainingTime);

      if (remainingTime <= 0) {
        console.log("Получено 0, ждём 5 секунд и повторяем запрос...");
        setTimeout(syncAndStartTimer, 5000);
        return;
      }

      setTimeLeft(remainingTime);

      // Обновляем контекст с оставшимся временем
      setData((prevData) => ({
        ...prevData, // Сохраняем остальные данные
        time: remainingTime / 1000, // Обновляем только время
      }));
    } catch (error) {
      console.error("Ошибка синхронизации времени в Timer:", error);
    }
  }, [data, setData]);

  // Инициализация таймера
  useEffect(() => {
    syncAndStartTimer();
  }, [syncAndStartTimer]);

  // Обновление оставшегося времени каждую секунду
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

  // Обработка завершения таймера
  useEffect(() => {
    if (timeLeft === 0) {
      onTimerEnd();
      syncAndStartTimer();
    }
  }, [timeLeft, onTimerEnd, syncAndStartTimer]);

  // Форматирование времени
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
