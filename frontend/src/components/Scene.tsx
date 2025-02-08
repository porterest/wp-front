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
  // Ссылка на группу, которая будет поворачиваться
  const groupRef = useRef<THREE.Group>(null);

  return (
    <>
      <Canvas camera={{ position: [10, 10, 10], fov: 60 }}>
        {/* Отключаем стандартное вращение, так как будем управлять через наш элемент */}
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />

        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} castShadow />

        <ScaleProvider data={data}>
          {/* Оборачиваем всё содержимое сцены в группу, чтобы к ней применять повороты */}
          <group ref={groupRef}>{children}</group>
          <ScaleHandler onScaleReady={onScaleReady} />
        </ScaleProvider>
      </Canvas>

      {/* Элемент управления трекболлом */}
      <TrackballControl groupRef={groupRef} />
    </>
  );
};

const ScaleHandler: React.FC<{ onScaleReady: (scaleFunctions: ScaleFunctions) => void }> = ({ onScaleReady }) => {
  const scaleFunctions = useScale();

  useEffect(() => {
    onScaleReady(scaleFunctions);
    // console.log("scales exposed", scaleFunctions);
  }, [onScaleReady, scaleFunctions]);

  return null;
};

interface TrackballControlProps {
  groupRef: React.RefObject<THREE.Group>;
}

/**
 * TrackballControl – элемент в виде круга, позволяющий вращать сцену по виртуальному трекболлу.
 * При нажатии и перетаскивании вычисляется поворот от предыдущего положения мыши к текущему,
 * и соответствующая кватернион-поворот применяется к группе сцены.
 */
const TrackballControl: React.FC<TrackballControlProps> = ({ groupRef }) => {
  const controlRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Храним предыдущую позицию в виде вектора на виртуальном трекболле
  const [prevVector, setPrevVector] = useState<THREE.Vector3 | null>(null);
  // Радиус элемента в пикселях (элемент будет иметь диаметр = 2*radius)
  const radius = 50;

  // Преобразуем координаты мыши в 3D-вектор на сфере трекболла
  const getTrackballVector = (clientX: number, clientY: number): THREE.Vector3 => {
    if (!controlRef.current) return new THREE.Vector3();
    const rect = controlRef.current.getBoundingClientRect();
    // Центр элемента
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Нормализуем координаты: от центра – в диапазоне [-1, 1]
    let x = (clientX - centerX) / radius;
    // Инвертируем Y (так как экранная система координат перевёрнута)
    let y = (centerY - clientY) / radius;
    const lengthSq = x * x + y * y;
    let z = 0;
    if (lengthSq > 1) {
      // Если точка вне сферы – нормализуем её до окружности
      const norm = 1 / Math.sqrt(lengthSq);
      x *= norm;
      y *= norm;
      z = 0;
    } else {
      // На сфере: z = sqrt(1 - x^2 - y^2)
      z = Math.sqrt(1 - lengthSq);
    }
    return new THREE.Vector3(x, y, z).normalize();
  };

  // При нажатии мыши – сохраняем исходный вектор
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const vector = getTrackballVector(e.clientX, e.clientY);
    setPrevVector(vector);
    setIsDragging(true);
  };

  // При движении мыши – вычисляем поворот
  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging || !prevVector || !groupRef.current) return;
    const currVector = getTrackballVector(e.clientX, e.clientY);
    // Вычисляем угол между предыдущим и текущим вектором
    const dot = prevVector.dot(currVector);
    // Из-за погрешностей ограничиваем значение в диапазоне [-1, 1]
    const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
    if (angle) {
      // Вычисляем ось поворота (перекрестное произведение)
      const axis = new THREE.Vector3().crossVectors(prevVector, currVector).normalize();
      if (axis.lengthSq() < 1e-6) return;
      const quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle(axis, angle);
      // Применяем полученный кватернион к существующему повороту группы
      groupRef.current.quaternion.premultiply(quaternion);
    }
    // Обновляем предыдущий вектор
    setPrevVector(currVector);
  };

  const onMouseUp = () => {
    setIsDragging(false);
    setPrevVector(null);
  };

  // При перетаскивании добавляем обработчики на уровне окна
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
        backgroundColor: "#4B0082", // тёмно-синефиолетовый цвет
        cursor: "grab",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: "18px",
      }}
    >
      {/* Можно разместить иконку или текст */}
      ↻
    </div>
  );
};

export default Scene;
