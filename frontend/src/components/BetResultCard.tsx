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
    <div
      style={{
        position: "fixed",
        top: "100px", // Точное позиционирование по вертикали
        left: "16px",
        zIndex: 50,
      }}
      className={className}
    >
      {/* Кнопка */}
      <button
        style={{
          width: "140px",
          padding: "8px",
          left: "57%",
          backgroundColor: "rgba(34, 211, 238)", // Соответствует bg-cyan-400 с прозрачностью
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          backdropFilter: "blur(5px)",
          cursor: "pointer",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        Last Bet Result
      </button>

      {/* Панель с результатом */}
      {isOpen && (
        <div
          style={{
            marginTop: "8px",
            width: "240px",
            padding: "12px",
            backgroundColor: "rgba(0,255,255,0.2)", // базовый бирюзовый оттенок с прозрачностью
            color: "#fff",
            borderRadius: "12px",
            boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
            backdropFilter: "blur(10px)", // размытый фон
            border: "1px solid rgba(0,0,255,0.5)", // синяя обводка
            fontSize: "14px",
          }}
        >
          {error ? (
            <div style={{ color: "rgba(255,0,0,0.8)" }}>{error}</div>
          ) : !betResult ? (
            <div>Loading...</div>
          ) : (
            <div>
              <h3 style={{ fontWeight: "bold", marginBottom: "4px" }}>
                Bet Result
              </h3>
              <p>
                <strong>Pair:</strong> {betResult.pair_name}
              </p>
              <p>
                <strong>Amount:</strong> {betResult.amount}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(betResult.created_at).toLocaleString()}
              </p>
              {betResult.accuracy !== null && betResult.accuracy !== undefined && (
                <p>
                  <strong>Accuracy:</strong> {betResult.accuracy}
                </p>
              )}
              {betResult.reward !== null && betResult.reward !== undefined && (
                <p>
                  <strong>Reward:</strong> {betResult.reward}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BetResultCloud;
