import React from "react";

interface InstructionsProps {
    onClose: () => void;
}

const Instructions: React.FC<InstructionsProps> = ({ onClose }) => (
    <div
        style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
        }}
    >
        <div
            style={{
                maxWidth: "600px",
                padding: "20px",
                background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                borderRadius: "15px",
                textAlign: "center",
                boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.5)",
                color: "white",
            }}
        >
            <h2>Добро пожаловать в игру!</h2>
            <p><strong>Есть 3 режима отображения графика:</strong></p>
            <ol>
                <li><strong>Режим ставок</strong>: Свечи скрыты, сосредоточьтесь на ставке.</li>
                <li><strong>Режим анализа</strong>: Только свечи для анализа.</li>
                <li><strong>Комбинированный режим</strong>: Свечи и ставки видны.</li>
            </ol>
            <p><strong>Как сделать ставку?</strong></p>
            <ul>
                <li>Потяните синюю сферу для выбора направления и величины ставки.</li>
                <li>Для точности поворачивайте график.</li>
            </ul>
            <p><strong>Дополнительные возможности:</strong></p>
            <ul>
                <li>Выбор валютной пары через меню в верхнем углу.</li>
                <li>
                    Оси графика:
                    <ul>
                        <li>X (фиолетовая): Время.</li>
                        <li>Y (синяя): Цена.</li>
                        <li>Z (бирюзовая): Объём.</li>
                    </ul>
                </li>
            </ul>
            <button
                onClick={onClose}
                style={{
                    marginTop: "20px",
                    padding: "10px 20px",
                    backgroundColor: "#000000",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                }}
            >
                Понятно!
            </button>
        </div>
    </div>
);

export default Instructions;
