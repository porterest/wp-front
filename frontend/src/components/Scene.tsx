import React, { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ScaleProvider, useScale } from "../context/ScaleContext";
import { ScaleFunctions } from "../types/scale";
import { CandleData } from "../types/candles";
import BetArrow from "./BetArrow";

interface SceneProps {
  children: React.ReactNode;
  orbitControlsEnabled: boolean;
  data: CandleData[];
  onScaleReady: (scaleFunctions: ScaleFunctions) => void;
  style?: React.CSSProperties;
  previousBetEnd: THREE.Vector3;
  userPreviousBet: THREE.Vector3;
  setUserPreviousBet: (value: THREE.Vector3) => void;
  axisMode: "X" | "Y";
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  betAmount: number;
  setBetAmount: (newAmount: number) => void;
}

const Scene: React.FC<SceneProps> = ({
                                       children,
                                       data,
                                       onScaleReady,
                                       previousBetEnd,
                                       userPreviousBet,
                                       setUserPreviousBet,
                                       axisMode,
                                       onDragging,
                                       onShowConfirmButton,
                                       betAmount,
                                       setBetAmount,
                                     }) => {
  // Ссылка на группу, к которой будем применять повороты (если потребуется для других целей)
  const groupRef = useRef<THREE.Group>(null);

  return (
    <>
      <Canvas camera={{ position: [10, 10, 10], fov: 60 }}>
        {/* Отключаем стандартное вращение – управление осуществляется через наш трекбол */}
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
        <ScaleProvider data={data}>
          {/* Оборачиваем содержимое сцены в группу */}
          <group ref={groupRef}>{children}</group>
          <ScaleHandler onScaleReady={onScaleReady} />
          {/* Добавляем BetArrow – он отвечает за отображение линий и стрелок ставок */}
          <BetArrow
            previousBetEnd={previousBetEnd}
            userPreviousBet={userPreviousBet}
            setUserPreviousBet={setUserPreviousBet}
            axisMode={axisMode}
            onDragging={onDragging}
            onShowConfirmButton={onShowConfirmButton}
            betAmount={betAmount}
            setBetAmount={setBetAmount}
          />
        </ScaleProvider>
      </Canvas>

      {/* Трекбол с осями для управления поворотом камеры */}
      <TrackballControlAxes groupRef={groupRef} />
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
   TrackballControlAxes
   ============================================================
   Отображение осей:
   - Ось X (цена): бирюзовый (#00FFFF)
   - Ось Y (время): синий (#0000FF)
   - Ось Z (транзакции): фиолетовый (#9400D3)
   При двойном клике трекбол сбрасывает поворот камеры.
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
      // Применяем поворот к камере (или группе, если требуется)
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

  // При двойном клике сбрасываем поворот камеры (группы)
  const resetGraph = () => {
    if (groupRef.current) {
      groupRef.current.quaternion.set(0, 0, 0, 1);
    }
  };

  return (
    <div
      ref={controlRef}
      onMouseDown={onMouseDown}
      onDoubleClick={resetGraph}
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
      }}
    >
      {/* Ось X: горизонтальная линия (бирюзовый) */}
      <div
        style={{
          position: "absolute",
          width: "80%",
          height: "2px",
          background: "#00FFFF",
        }}
      />
      {/* Ось Y: вертикальная линия (синий) */}
      <div
        style={{
          position: "absolute",
          height: "80%",
          width: "2px",
          background: "#0000FF",
        }}
      />
      {/* Ось Z: окружность (фиолетовая) */}
      <div
        style={{
          position: "absolute",
          width: "60%",
          height: "60%",
          border: "2px solid #9400D3",
          borderRadius: "50%",
        }}
      />
    </div>
  );
};

export default Scene;
