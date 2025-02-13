import React, { useEffect, useState } from "react";
import { getUserBetResult } from "../services/api";
import { BetResult } from "../types/apiTypes";

interface BetResultDropdownProps {
  className?: string;
}

const BetResultDropdown: React.FC<BetResultDropdownProps> = ({ className }) => {
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
    <div className={`fixed top-4 left-4 z-50 ${className || ""}`}>
      <button
        className="flex items-center justify-between w-64 p-3 bg-blue-900 bg-opacity-80 backdrop-blur-md text-white font-semibold rounded shadow hover:bg-blue-800 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        Last Bet Result <span>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="mt-2 p-4 w-64 bg-blue-800 bg-opacity-90 backdrop-blur-md rounded shadow-lg text-white transition-all">
          {error ? (
            <div className="text-red-400">{error}</div>
          ) : !betResult ? (
            <div>Loading bet result...</div>
          ) : (
            <div>
              <p>
                <strong>Pair:</strong> {betResult.pair_name}
              </p>
              <p>
                <strong>Amount:</strong> {betResult.amount}
              </p>
              <p>
                <strong>Date:</strong> {new Date(betResult.created_at).toLocaleString()}
              </p>
              <p>
                <strong>Accuracy:</strong> {betResult.accuracy}%
              </p>
              <p>
                <strong>Reward:</strong> {betResult.reward}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BetResultDropdown;
