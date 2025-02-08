import React, { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ScaleProvider, useScale } from "../context/ScaleContext";
import { ScaleFunctions } from "../types/scale";
import { CandleData } from "../types/candles";
import BetArrow from "./BetArrow";
import CameraTrackballControl from "./CameraTrackballControl";

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
  return (
    <Canvas camera={{ position: [10, 10, 10], fov: 60 }}>
      {/* Отключаем встроенные вращения — камера будет управляться нашим трекболом */}
      <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
      <ScaleProvider data={data}>
        {/* Рендерим график (children) */}
        {children}
        <ScaleHandler onScaleReady={onScaleReady} />
        {/* Рендерим компонент ставок */}
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
      {/* Рендерим компонент управления камерой (трекибол с осями) */}
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
