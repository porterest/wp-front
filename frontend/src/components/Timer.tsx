import React, { useEffect, useState } from "react";
import { fetchTime } from "../services/api";

interface TimerProps {
  onTimerEnd: () => void; // Callback при завершении таймера
  className?: string; // Дополнительный класс для стилизации
}

const Timer: React.FC<TimerProps> = ({ onTimerEnd }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // Оставшееся время

  useEffect(() => {
    const syncAndStartTimer = async () => {
      try {
        console.log("Starting timer");
        const timeData = await fetchTime();
        console.log(`time fetched : ${timeData}`);

        const remainingTime = timeData.remaining_time_in_block * 1000; // В миллисекундах
        console.log("remaining time", remainingTime);
        setTimeLeft(remainingTime);

        const timeout = setTimeout(() => {
          onTimerEnd();
        }, remainingTime);

        useEffect(() => {
          if (timeLeft === 0) {
            // Когда таймер достигает 0, запросить новое время
            onTimerEnd();
            syncAndStartTimer();
          }
        }, [timeLeft]);



        return () => clearTimeout(timeout); // Очистка таймера при размонтировании
      } catch (error) {
        console.error("Ошибка синхронизации времени в Timer:", error);
      }
    };

    syncAndStartTimer();
  }, []);

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
