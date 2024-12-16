import React from "react";

interface ConfirmBetButtonProps {
  onConfirm: () => void;
}

export const ConfirmBetButton: React.FC<ConfirmBetButtonProps> = ({ onConfirm }) => (
  <button
    onClick={onConfirm}
    className="absolute bottom-[70px] right-[20px] bg-cyan-400 text-white py-2 px-4 rounded-lg cursor-pointer z-10 hover:bg-cyan-500"
  >
    Confirm Bet
  </button>
);

export default ConfirmBetButton;
