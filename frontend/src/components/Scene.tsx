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
  // Выбор варианта трекбола: "axes" или "fancy"
  const [variant, setVariant] = useState<"axes" | "fancy">("axes");

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

      {/* Для демонстрации можно выбрать вариант управления: */}
      {variant === "axes" ? (
        <TrackballControlAxes groupRef={groupRef} />
      ) : (
        <TrackballControlFancy groupRef={groupRef} />
      )}

      {/* Пример переключателя вариантов (для удобства тестирования) */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          background: "#fff",
          border: "1px solid #ccc",
          padding: "5px",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setVariant((prev) => (prev === "axes" ? "fancy" : "axes"))}
      >
        Переключить вариант (сейчас: {variant})
      </div>
    </>
  );
};

const ScaleHandler: React.FC<{ onScaleReady: (scaleFunctions: ScaleFunctions) => void }> = ({
                                                                                              onScaleReady,
                                                                                            }) => {
  const scaleFunctions = useScale();

  useEffect(() => {
    onScaleReady(scaleFunctions);
  }, [onScaleReady, scaleFunctions]);

  return null;
};

interface TrackballControlProps {
  groupRef: React.RefObject<THREE.Group>;
}

/* ============================================================
   Variant 1: Трекбол с отображением осей X, Y, Z
   ============================================================
   В этом варианте в центре круга отображаются:
   - Красная горизонтальная линия (ось X)
   - Зелёная вертикальная линия (ось Y)
   - Синяя окружность (намёк на ось Z)
   ============================================================ */
const TrackballControlAxes: React.FC<TrackballControlProps> = ({ groupRef }) => {
  const controlRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [prevVector, setPrevVector] = useState<THREE.Vector3 | null>(null);
  const radius = 50;

  const getTrackballVector = (clientX: number, clientY: number): THREE.Vector3 => {
    if (!controlRef.current) return new THREE.Vector3();
    const rect = controlRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let x = (clientX - centerX) / radius;
    let y = (centerY - clientY) / radius; // инвертируем Y
    const lengthSq = x * x + y * y;
    let z = 0;
    if (lengthSq > 1) {
      const norm = 1 / Math.sqrt(lengthSq);
      x *= norm;
      y *= norm;
      z = 0;
    } else {
      z = Math.sqrt(1 - lengthSq);
    }
    return new THREE.Vector3(x, y, z).normalize();
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const vector = getTrackballVector(e.clientX, e.clientY);
    setPrevVector(vector);
    setIsDragging(true);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging || !prevVector || !groupRef.current) return;
    const currVector = getTrackballVector(e.clientX, e.clientY);
    const dot = prevVector.dot(currVector);
    const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
    if (angle) {
      const axis = new THREE.Vector3().crossVectors(prevVector, currVector).normalize();
      if (axis.lengthSq() < 1e-6) return;
      const quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle(axis, angle);
      groupRef.current.quaternion.premultiply(quaternion);
    }
    setPrevVector(currVector);
  };

  const onMouseUp = () => {
    setIsDragging(false);
    setPrevVector(null);
  };

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
        background: "radial-gradient(circle, #4B0082 10%, #000099 90%)",
        cursor: "grab",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Лишнее свойство position удалено
      }}
    >
      {/* X-ось: горизонтальная красная линия */}
      <div
        style={{
          position: "absolute",
          width: "80%",
          height: "2px",
          background: "#FF0000",
        }}
      />
      {/* Y-ось: вертикальная зелёная линия */}
      <div
        style={{
          position: "absolute",
          height: "80%",
          width: "2px",
          background: "#00FF00",
        }}
      />
      {/* Z-ось: синяя окружность */}
      <div
        style={{
          position: "absolute",
          width: "60%",
          height: "60%",
          border: "2px solid #0000FF",
          borderRadius: "50%",
        }}
      />
    </div>
  );
};

/* ============================================================
   Variant 2: Fancy трекбол
   ============================================================
   Этот вариант использует мягкий градиент, эффект подсветки при наведении и
   небольшую анимацию (уменьшение масштаба) при перетаскивании.
   ============================================================ */
const TrackballControlFancy: React.FC<TrackballControlProps> = ({ groupRef }) => {
  const controlRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [prevVector, setPrevVector] = useState<THREE.Vector3 | null>(null);
  const [hover, setHover] = useState(false);
  const radius = 50;

  const getTrackballVector = (clientX: number, clientY: number): THREE.Vector3 => {
    if (!controlRef.current) return new THREE.Vector3();
    const rect = controlRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let x = (clientX - centerX) / radius;
    let y = (centerY - clientY) / radius;
    const lengthSq = x * x + y * y;
    let z = 0;
    if (lengthSq > 1) {
      const norm = 1 / Math.sqrt(lengthSq);
      x *= norm;
      y *= norm;
      z = 0;
    } else {
      z = Math.sqrt(1 - lengthSq);
    }
    return new THREE.Vector3(x, y, z).normalize();
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setPrevVector(getTrackballVector(e.clientX, e.clientY));
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging || !prevVector || !groupRef.current) return;
    const currVector = getTrackballVector(e.clientX, e.clientY);
    const dot = prevVector.dot(currVector);
    const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
    if (angle) {
      const axis = new THREE.Vector3().crossVectors(prevVector, currVector).normalize();
      if (axis.lengthSq() < 1e-6) return;
      const quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle(axis, angle);
      groupRef.current.quaternion.premultiply(quaternion);
    }
    setPrevVector(currVector);
  };

  const onMouseUp = () => {
    setIsDragging(false);
    setPrevVector(null);
  };

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
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        width: `${radius * 2}px`,
        height: `${radius * 2}px`,
        borderRadius: "50%",
        background: "radial-gradient(circle, #3a3f9b, #141a41)",
        boxShadow: hover
          ? "0 0 15px rgba(58, 63, 155, 0.8)"
          : "0 0 8px rgba(20, 26, 65, 0.5)",
        cursor: "grab",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "box-shadow 0.3s, transform 0.1s",
        transform: isDragging ? "scale(0.95)" : "scale(1)",
      }}
    >
      <span style={{ color: "#fff", fontSize: "20px" }}>⟳</span>
    </div>
  );
};

export default Scene;
