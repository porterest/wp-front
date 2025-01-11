import React, { useState } from "react";

interface ConfirmBetButtonProps {
  onConfirm: () => void;
}

export const ConfirmBetButton: React.FC<ConfirmBetButtonProps> = ({ onConfirm }) => {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClick = () => {
    onConfirm();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000); // Hide the message after 3 seconds
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="absolute bottom-[70px] right-[20px] bg-cyan-400 text-white py-2 px-4 rounded-lg cursor-pointer z-10 hover:bg-cyan-500"
      >
        Confirm Bet
      </button>
      {showSuccess && (
        <div className="absolute bottom-[120px] right-[20px] bg-green-500 text-white p-2 rounded shadow-md">
          Bet placed successfully!
        </div>
      )}
    </div>
  );
};

export default ConfirmBetButton;
