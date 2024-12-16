import React from "react";

interface InstructionsProps {
  onClose: () => void;
}

const Instructions: React.FC<InstructionsProps> = ({ onClose }) => (
  <div className="fixed top-0 left-0 w-screen h-screen bg-black bg-opacity-80 text-white flex justify-center items-center z-[1000]">
    <div
      className="max-w-lg p-5 rounded-2xl text-center shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
      style={{ background: "linear-gradient(135deg, #6a11cb, #2575fc)" }}
    >
      <h2 className="text-xl font-bold">Добро пожаловать в игру!</h2>
      <p className="mt-4 font-semibold">Есть 3 режима отображения графика:</p>
      <ol className="list-decimal list-inside text-left mt-2 space-y-1">
        <li>
          <strong>Режим ставок</strong>: Свечи скрыты, сосредоточьтесь на
          ставке.
        </li>
        <li>
          <strong>Режим анализа</strong>: Только свечи для анализа.
        </li>
        <li>
          <strong>Комбинированный режим</strong>: Свечи и ставки видны.
        </li>
      </ol>
      <p className="mt-4 font-semibold">Как сделать ставку?</p>
      <ul className="list-disc list-inside text-left mt-2 space-y-1">
        <li>Потяните синюю сферу для выбора направления и величины ставки.</li>
        <li>Для точности поворачивайте график.</li>
      </ul>
      <p className="mt-4 font-semibold">Дополнительные возможности:</p>
      <ul className="list-disc list-inside text-left mt-2 space-y-1">
        <li>Выбор валютной пары через меню в верхнем углу.</li>
        <li>
          Оси графика:
          <ul className="list-none pl-4">
            <li>
              <strong>X (фиолетовая):</strong> Время.
            </li>
            <li>
              <strong>Y (синяя):</strong> Цена.
            </li>
            <li>
              <strong>Z (бирюзовая):</strong> Объём.
            </li>
          </ul>
        </li>
      </ul>
      <button
        onClick={onClose}
        className="mt-5 px-5 py-2 bg-black text-white rounded-md cursor-pointer hover:bg-opacity-90"
      >
        Понятно!
      </button>
    </div>
  </div>
);

export default Instructions;
