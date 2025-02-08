import React, { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ScaleProvider, useScale } from "../context/ScaleContext";
import { ScaleFunctions } from "../types/scale";
import { CandleData } from "../types/candles";

interface SceneProps {
  children: React.ReactNode;
  orbitControlsEnabled: boolean;
  data: CandleData[];
  onScaleReady: (scaleFunctions: ScaleFunctions) => void;
  style?: React.CSSProperties;
}

const Scene: React.FC<SceneProps> = ({ children, data, onScaleReady }) => {
  // Ссылка на группу, к которой будем применять повороты
  const groupRef = useRef<THREE.Group>(null);

  return (
    <>
      <Canvas camera={{ position: [10, 10, 10], fov: 60 }}>
        {/* Отключаем стандартное вращение – будем управлять через наш трекбол */}
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} castShadow />

        <ScaleProvider data={data}>
          {/* Оборачиваем содержимое сцены в группу для применения к ней поворотов */}
          <group ref={groupRef}>{children}</group>
          <ScaleHandler onScaleReady={onScaleReady} />
        </ScaleProvider>
      </Canvas>

      {/* Элемент управления трекболом */}
      <TrackballControl groupRef={groupRef} />
    </>
  );
};

const ScaleHandler: React.FC<{ onScaleReady: (scaleFunctions: ScaleFunctions) => void }> = ({ onScaleReady }) => {
  const scaleFunctions = useScale();

  useEffect(() => {
    onScaleReady(scaleFunctions);
  }, [onScaleReady, scaleFunctions]);

  return null;
};

interface TrackballControlProps {
  groupRef: React.RefObject<THREE.Group>;
}

/**
 * TrackballControl – элемент в виде круга, который позволяет вращать сцену по виртуальному трекболу.
 * При нажатии и перетаскивании вычисляется кватернион-поворот, который применяется к группе сцены.
 */
const TrackballControl: React.FC<TrackballControlProps> = ({ groupRef }) => {
  // Реф для HTML-элемента трекбола
  const controlRef = useRef<HTMLDivElement>(null);
  // Состояние, определяющее, производится ли сейчас перетаскивание
  const [isDragging, setIsDragging] = useState(false);
  // Сохраняем предыдущий вектор на виртуальном трекболе
  const [prevVector, setPrevVector] = useState<THREE.Vector3 | null>(null);
  // Радиус трекбола (в пикселях)
  const radius = 50;

  // Преобразование координат мыши в 3D-вектор на сфере трекбола
  const getTrackballVector = (clientX: number, clientY: number): THREE.Vector3 => {
    if (!controlRef.current) return new THREE.Vector3();
    const rect = controlRef.current.getBoundingClientRect();
    // Центр элемента
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Нормализуем координаты относительно центра (в диапазоне [-1, 1])
    let x = (clientX - centerX) / radius;
    let y = (centerY - clientY) / radius; // инвертируем Y, так как экранная система координат перевёрнута
    const lengthSq = x * x + y * y;
    let z = 0;
    if (lengthSq > 1) {
      // Если точка вне сферы, нормализуем до окружности
      const norm = 1 / Math.sqrt(lengthSq);
      x *= norm;
      y *= norm;
      z = 0;
    } else {
      // На сфере: вычисляем Z как дополнение до единичной окружности
      z = Math.sqrt(1 - lengthSq);
    }
    return new THREE.Vector3(x, y, z).normalize();
  };

  // Обработчик нажатия мыши
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const vector = getTrackballVector(e.clientX, e.clientY);
    setPrevVector(vector);
    setIsDragging(true);
  };

  // Обработчик перемещения мыши
  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging || !prevVector || !groupRef.current) return;
    const currVector = getTrackballVector(e.clientX, e.clientY);
    // Вычисляем угол между предыдущим и текущим вектором
    const dot = prevVector.dot(currVector);
    const clampedDot = Math.min(1, Math.max(-1, dot)); // ограничиваем значения
    const angle = Math.acos(clampedDot);
    if (angle) {
      // Вычисляем ось поворота как векторное произведение
      const axis = new THREE.Vector3().crossVectors(prevVector, currVector).normalize();
      if (axis.lengthSq() < 1e-6) return;
      // Создаём кватернион для поворота
      const quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle(axis, angle);
      // Применяем поворот к группе
      groupRef.current.quaternion.premultiply(quaternion);
    }
    // Обновляем предыдущий вектор
    setPrevVector(currVector);
  };

  // Обработчик отпускания мыши
  const onMouseUp = () => {
    setIsDragging(false);
    setPrevVector(null);
  };

  // Добавляем глобальные обработчики перемещения и отпускания мыши во время перетаскивания
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    } else {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, prevVector]);

  return (
    <div
      ref={controlRef}
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        width: `${radius * 2}px`,
        height: `${radius * 2}px`,
        borderRadius: "50%",
        background: "radial-gradient(circle, #4B0082 10%, #000099 90%)", // Градиент от темно-фиолетового к синему
        cursor: "grab",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: "18px",
      }}
    >
      {/* Здесь можно разместить иконку или символ */}
      ↻
    </div>
  );
};

export default Scene;
