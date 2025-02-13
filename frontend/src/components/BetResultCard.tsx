import React, { useEffect, useState } from "react";
import { getUserBetResult } from "../services/api";
import { BetResult } from "../types/apiTypes";

interface BetResultCloudProps {
  className?: string;
}

const BetResultCloud: React.FC<BetResultCloudProps> = ({ className }) => {
  const [betResult, setBetResult] = useState<BetResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchBetResult = async () => {
      try {
        const result = await getUserBetResult();
        setBetResult(result);
      } catch (error) {
        console.error("Error loading bet result", error);
        setError("Failed to load bet result");
      }
    };

    fetchBetResult();
  }, []);

  return (
    <div className={`fixed top-12 left-4 z-50 ${className || ""}`}>
      {/* Небольшая кнопка в виде расплывчатого фиолетового облака */}
      <button
        className="flex items-center justify-center w-28 p-2 bg-purple-900 bg-opacity-80 backdrop-blur-md text-white font-medium rounded-full shadow hover:bg-purple-800 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        Last Bet
      </button>

      {/* Панель с результатом ставки */}
      {isOpen && (
        <div className="mt-2 p-3 w-64 bg-purple-900 bg-opacity-80 backdrop-blur-md rounded shadow-lg text-white transition-all">
          {error ? (
            <div className="text-red-300 text-sm">{error}</div>
          ) : !betResult ? (
            <div className="text-sm">Loading...</div>
          ) : (
            <div>
              <h3 className="text-base font-bold mb-1">Bet Result</h3>
              <p className="text-sm">
                <strong>Pair:</strong> {betResult.pair_name}
              </p>
              <p className="text-sm">
                <strong>Amount:</strong> {betResult.amount}
              </p>
              <p className="text-sm">
                <strong>Date:</strong> {new Date(betResult.created_at).toLocaleString()}
              </p>
              <p className="text-sm">
                <strong>Accuracy:</strong> {betResult.accuracy}%
              </p>
              <p className="text-sm">
                <strong>Reward:</strong> {betResult.reward}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BetResultCloud;
