import React, { useState } from "react";

interface ConfirmBetButtonProps {
  onConfirm: () => void;
}

export const ConfirmBetButton: React.FC<ConfirmBetButtonProps> = ({ onConfirm }) => {
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    onConfirm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
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
          <div className="bg-white rounded-lg p-6 shadow-lg text-center relative">
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
            >
              &times;
            </button>
            <h2 className="text-xl font-semibold mb-2 text-black">Success!</h2>
            <p className="text-black">Bet placed successfully.</p>
          </div>
        </div>
      )}
    </>
  );
};

export default ConfirmBetButton;
