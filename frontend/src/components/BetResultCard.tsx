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
      } catch (err) {
        console.error("Error loading bet result", err);
        setError("Failed to load bet result");
      }
    };

    fetchBetResult();
  }, []);

  return (
    <div className={`fixed top-64 left-4 z-50 ${className || ""}`}>
      {/* Кнопка с бирюзовым фоном */}
      <button
        className="flex items-center justify-center w-28 p-2 bg-cyan-400 text-white font-medium rounded-full shadow-lg hover:bg-cyan-500 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        Last Bet
      </button>

      {/* Панель с результатом, прозрачная и размытая, с синей обводкой */}
      {isOpen && (
        <div className="mt-2 p-3 w-64 bg-[rgba(0,255,255,0.2)] backdrop-blur-lg rounded shadow-lg border border-blue-900 text-white transition-all">
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
                <strong>Date:</strong>{" "}
                {new Date(betResult.created_at).toLocaleString()}
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
