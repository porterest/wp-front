import React from "react";

interface ConfirmBetButtonProps {
    onConfirm: () => void;
}

const ConfirmBetButton: React.FC<ConfirmBetButtonProps> = ({ onConfirm }) => (
    <button
        onClick={onConfirm}
        style={{
            position: "absolute",
            bottom: "70px",
            right: "20px",
            backgroundColor: "#00FFFF",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            zIndex: 10,
        }}
    >
        Confirm Bet
    </button>
);

export default ConfirmBetButton;
