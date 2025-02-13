import React, { useEffect, useState } from "react";
import { getUserBetResult } from "../services/api";
import { BetResult } from "../types/apiTypes";

interface BetResultCardProps {
  className?: string;
}
const BetResultCard: React.FC<BetResultCardProps> = ({ className }) => {
  const [betResult, setBetResult] = useState<BetResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBetResult = async () => {
      try {
        const result = await getUserBetResult();
        setBetResult(result);
      } catch (error) {
        console.error("Ошибка загрузки результата ставки", error);
        setError("Не удалось загрузить результат ставки");
      }
    };

    fetchBetResult();
  }, []);

  if (error) {
    return (
      <div className={`absolute top-8 left-4 p-4 bg-red-500 bg-opacity-70 text-white rounded shadow ${className || ''}`}>
        {error}
      </div>
    );
  }

  if (!betResult) {
    return (
      <div className={`absolute top-8 left-4 p-4 bg-gray-200 bg-opacity-70 rounded shadow ${className || ''}`}>
        Загрузка результата ставки...
      </div>
    );
  }

  return (
    <div className={`absolute top-4 left-4 p-4 bg-white bg-opacity-70 backdrop-blur-md rounded shadow-lg ${className || ''}`}>
      <h3 className="text-lg font-bold mb-2">Результат ставки</h3>
      <p>
        <strong>Пара:</strong> {betResult.pair_name}
      </p>
      <p>
        <strong>Сумма:</strong> {betResult.amount}
      </p>
      <p>
        <strong>Дата:</strong> {new Date(betResult.created_at).toLocaleString()}
      </p>
      <p>
        <strong>Точность:</strong> {betResult.accuracy}%
      </p>
      <p>
        <strong>Вознаграждение:</strong> {betResult.reward}
      </p>
    </div>
  );
};


export default BetResultCard;
