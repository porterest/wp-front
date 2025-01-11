import React, { useState } from "react";

interface ConfirmBetButtonProps {
  onConfirm: () => void;
}

export const ConfirmBetButton: React.FC<ConfirmBetButtonProps> = ({ onConfirm }) => {
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    onConfirm();
    setShowModal(true);
    setTimeout(() => setShowModal(false), 3000); // Закрыть окно через 3 секунды
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="absolute bottom-[70px] right-[20px] bg-cyan-400 text-white py-2 px-4 rounded-lg cursor-pointer z-10 hover:bg-cyan-500"
      >
        Confirm Bet
      </button>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
          <div className="bg-white rounded-lg p-6 shadow-lg text-center">
            <h2 className="text-xl font-semibold mb-2">Success!</h2>
            <p>Bet placed successfully.</p>
          </div>
        </div>
      )}
    </>
  );
};

export default ConfirmBetButton;
