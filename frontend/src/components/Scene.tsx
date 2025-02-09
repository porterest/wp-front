import React, { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ScaleProvider, useScale } from "../context/ScaleContext";
import { ScaleFunctions } from "../types/scale";
import { CandleData } from "../types/candles";
import GraphModes from "./GraphModes";
import CameraTrackballControl from "./CameraTrackballControl";
import CandlestickChart from "./CandlestickChart"; // Импортируем CandlestickChart
import * as THREE from "three";

interface SceneProps {
  children?: React.ReactNode;
  data: CandleData[];
  onScaleReady: (scaleFunctions: ScaleFunctions) => void;
  style?: React.CSSProperties;
  // Пропсы для GraphModes:
  previousBetEnd: THREE.Vector3;
  userPreviousBet: THREE.Vector3;
  setUserPreviousBet: (value: THREE.Vector3) => void;
  axisMode: "X" | "Y";
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  currentMode: number;
  betsFetched: boolean;
}

const Scene: React.FC<SceneProps> = ({
                                       children,
                                       data,
                                       onScaleReady,
                                       style,
                                       previousBetEnd,
                                       userPreviousBet,
                                       setUserPreviousBet,
                                       axisMode,
                                       onDragging,
                                       onShowConfirmButton,
                                       currentMode,
                                       betsFetched,
                                     }) => {
  return (
    <Canvas camera={{ position: [10, 10, 10], fov: 60 }} style={style}>
      {/* Отключаем OrbitControls, чтобы управление камерой выполнялось только через CameraTrackballControl */}
      <OrbitControls enableRotate={false} enablePan={false} enableZoom={false} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} castShadow={true} />

      <ScaleProvider data={data}>
        {/* Добавляем компонент CandlestickChart */}
        <CandlestickChart data={data} mode="Candles" />

        {/* Если есть дополнительные дочерние элементы */}
        {children}

        <ScaleHandler onScaleReady={onScaleReady} />

        {/* Рендерим GraphModes, который обрабатывает ставки */}
        <GraphModes
          currentMode={currentMode}
          data={data}
          previousBetEnd={previousBetEnd}
          userPreviousBet={userPreviousBet}
          setUserPreviousBet={setUserPreviousBet}
          axisMode={axisMode}
          onDragging={onDragging}
          onShowConfirmButton={onShowConfirmButton}
          betsFetched={betsFetched}
        />
      </ScaleProvider>

      {/* Рендерим компонент управления камерой */}
      <CameraTrackballControl />
    </Canvas>
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

export default Scene;
