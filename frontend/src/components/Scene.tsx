import React, { useRef, useState } from "react";
import * as THREE from "three";

interface TrackballControlProps {
  groupRef: React.RefObject<THREE.Group>;
}

const TrackballControl: React.FC<TrackballControlProps> = ({ groupRef }) => {
  // Ссылка на элемент, в котором происходит перетаскивание
  const controlRef = useRef<HTMLDivElement>(null);
  // Флаг, указывающий, происходит ли в данный момент перетаскивание
  const [isDragging, setIsDragging] = useState(false);
  // Храним предыдущую позицию в виде вектора на виртуальном трекболле
  const [prevVector, setPrevVector] = useState<THREE.Vector3 | null>(null);
  // Для визуальных эффектов (например, подсветка)
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  // Радиус элемента в пикселях (диаметр = 2 * radius)
  const radius = 50;

  /**
   * Функция, которая преобразует координаты мыши в нормализованный 3D-вектор,
   * имитирующий положение на поверхности трекбола.
   */
  const getTrackballVector = (clientX: number, clientY: number): THREE.Vector3 => {
    if (!controlRef.current) return new THREE.Vector3();
    const rect = controlRef.current.getBoundingClientRect();
    // Определяем центр элемента
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Приводим координаты к диапазону [-1, 1]
    let x = (clientX - centerX) / radius;
    let y = (centerY - clientY) / radius; // инвертируем Y, чтобы верх был положительным
    const lengthSq = x * x + y * y;
    let z = 0;
    if (lengthSq > 1) {
      // Если точка находится вне единичного круга, нормализуем её
      const norm = 1 / Math.sqrt(lengthSq);
      x *= norm;
      y *= norm;
      z = 0;
    } else {
      // Если точка внутри круга, вычисляем Z как координату сферы
      z = Math.sqrt(1 - lengthSq);
    }
    return new THREE.Vector3(x, y, z).normalize();
  };

  /**
   * Обработчик движения мыши при перетаскивании.
   * Вычисляет текущий вектор и кватернион поворота, затем применяет его к группе.
   */
  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging || !prevVector || !groupRef.current) return;
    const currVector = getTrackballVector(e.clientX, e.clientY);
    const dot = prevVector.dot(currVector);
    // Ограничиваем значение для acos, чтобы избежать ошибок из-за погрешностей
    const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
    if (angle) {
      // Определяем ось поворота как векторное (крестовое) произведение
      const axis = new THREE.Vector3().crossVectors(prevVector, currVector).normalize();
      if (axis.lengthSq() < 1e-6) return;
      const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      // Применяем поворот, комбинируя с текущим поворотом группы
      groupRef.current.quaternion.premultiply(quaternion);
    }
    setPrevVector(currVector);
  };

  /**
   * Обработчик нажатия мыши. Сохраняет исходный вектор и запускает перетаскивание.
   */
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setPressed(true);
    setIsDragging(true);
    setPrevVector(getTrackballVector(e.clientX, e.clientY));
    // Добавляем глобальные обработчики для mousemove и mouseup
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  /**
   * Обработчик отпускания мыши. Останавливает перетаскивание.
   */
  const onMouseUp = () => {
    setPressed(false);
    setIsDragging(false);
    setPrevVector(null);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      ref={controlRef}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        width: `${radius * 2}px`,
        height: `${radius * 2}px`,
        borderRadius: "50%",
        // Градиентный фон: от фиолетового к синему
        background: `radial-gradient(circle, #4B0082 20%, #000099 80%)`,
        boxShadow: hover
          ? "0px 0px 15px rgba(75, 0, 130, 0.8)"
          : "0px 0px 10px rgba(75, 0, 130, 0.5)",
        transition: "box-shadow 0.2s ease-in-out",
        cursor: "grab",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: "18px",
        userSelect: "none",
        opacity: pressed ? 0.7 : 1,
      }}
    >
      ↻
    </div>
  );
};

export default TrackballControl;
