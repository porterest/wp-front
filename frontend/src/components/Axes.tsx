import React from "react";

const Axes = () => (
  <>
    {/* Ось Y (время) */}
    <mesh position={[0, 2.5, 0]}>
      <cylinderGeometry args={[0.05, 0.05, 5, 12]} />
      {/* Вертикальная линия */}
      <meshStandardMaterial color="#0000FF" />
      {/* Синий цвет */}
    </mesh>
    {/* Стрелка на конце оси Y */}
    <mesh position={[0, 5, 0]} rotation={[0, 0, 0]}>
      <coneGeometry args={[0.15, 0.3, 12]} />
      {/* Конус для стрелки */}
      <meshStandardMaterial color="#0000FF" />
      {/* Синий цвет */}
    </mesh>

    {/* Ось X (цена) */}
    <mesh position={[2.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.05, 0.05, 5, 12]} />
      {/* Горизонтальная линия */}
      <meshStandardMaterial color="#00FFFF" />
      {/* Бирюзовый цвет */}
    </mesh>
    {/* Стрелка на конце оси X */}
    <mesh position={[5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <coneGeometry args={[0.15, 0.3, 12]} />
      {/* Конус для стрелки */}
      <meshStandardMaterial color="#00FFFF" />
      {/* Бирюзовый цвет */}
    </mesh>

    {/* Ось Z (транзакции) */}
    <mesh position={[0, 0, 2.5]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.05, 0.05, 5, 12]} />
      {/* Линия в глубину */}
      <meshStandardMaterial color="#9400D3" />
      {/* Фиолетовый цвет */}
    </mesh>
    {/* Стрелка на конце оси Z */}
    <mesh position={[0, 0, 5]} rotation={[Math.PI / 2, 0, 0]}>
      <coneGeometry args={[0.15, 0.3, 12]} />
      {/* Конус для стрелки */}
      <meshStandardMaterial color="#9400D3" />
      {/* Фиолетовый цвет */}
    </mesh>
  </>
);

export default Axes;
