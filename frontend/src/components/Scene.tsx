import React, { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ScaleProvider, useScale } from "../context/ScaleContext";
import { ScaleFunctions } from "../types/scale";
import { CandleData } from "../types/candles";
import GraphModes from "./GraphModes";
import * as THREE from "three";

interface SceneProps {
  children: React.ReactNode;
  orbitControlsEnabled: boolean;
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
  betAmount: number;
  setBetAmount: (newAmount: number) => void;
}

const Scene: React.FC<SceneProps> = ({
                                       children,
                                       orbitControlsEnabled,
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
      {/* Используем orbitControlsEnabled для управления OrbitControls */}
      <OrbitControls
        enableRotate={orbitControlsEnabled}
        enablePan={orbitControlsEnabled}
        enableZoom={orbitControlsEnabled}
      />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} castShadow={true} />
      <ScaleProvider data={data}>
        {/* Рендерим график (children) */}
        {children}
        <ScaleHandler onScaleReady={onScaleReady} />
        {/* Рендерим GraphModes – здесь передаются все необходимые пропсы */}
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
