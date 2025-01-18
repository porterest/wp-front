import React, { useEffect, useState, useCallback, useRef } from "react";
import { fetchTime } from "../services/api";

interface TimerProps {
  onTimerEnd: () => void; // Callback при завершении таймера
  className?: string; // Дополнительный класс для стилизации
}

const Timer: React.FC<TimerProps> = ({ onTimerEnd, className = "" }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Определяем функцию синхронизации и старта таймера через useCallback,
  // чтобы не пересоздавать её при каждом рендере.
  const syncAndStartTimer = useCallback(async () => {
    try {
      console.log("Starting timer");
      const timeData = await fetchTime();
      console.log(`Time fetched: ${timeData}`);

      const remainingTime = timeData.remaining_time_in_block * 1000; // перевод в миллисекунды
      console.log("Remaining time:", remainingTime);

      // Если оставшееся время равно 0, подождать 5 секунд и сделать повторный запрос.
      if (remainingTime === 0) {
        console.log("Получено 0, ждём 5 секунд и повторяем запрос...");
        setTimeout(syncAndStartTimer, 5000);
        return;
      }
      setTimeLeft(remainingTime);
    } catch (error) {
      console.error("Ошибка синхронизации времени в Timer:", error);
    }
  }, []);

  // При монтировании компонента сразу запрашиваем время.
  useEffect(() => {
    syncAndStartTimer();
  }, [syncAndStartTimer]);

  // Обновляем оставшееся время каждую секунду.
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? Math.max(prev - 1000, 0) : null));
    }, 1000);

    // Очищаем интервал при размонтировании компонента.
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // При достижении 0 вызываем callback и немедленно синхронизируем новый таймер.
  useEffect(() => {
    if (timeLeft === 0) {
      onTimerEnd();
      syncAndStartTimer();
    }
  }, [timeLeft, onTimerEnd, syncAndStartTimer]);

  // Функция форматирования времени в формате "мин:сек"
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
