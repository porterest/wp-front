// Scene.tsx
import React, { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ScaleProvider, useScale } from "../context/ScaleContext";
import { ScaleFunctions } from "../types/scale";
import { CandleData } from "../types/candles";
import GraphModes from "./GraphModes";
import CameraTrackballControl from "./CameraTrackballControl";
import * as THREE from "three";
import HistoricalVectors from "./HistoricalVectors";

interface SceneProps {
  children: React.ReactNode;
  data: CandleData[];
  onScaleReady: (scaleFunctions: ScaleFunctions) => void;
  style?: React.CSSProperties;
  // Props для GraphModes:
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
  historicalVectors: Array<[number, number]>;
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
                                       historicalVectors,
                                     }) => {
  return (
    <Canvas camera={{ position: [10, 10, 10], fov: 60 }} style={style}>
      <OrbitControls enableRotate={false} enablePan={false} enableZoom={false} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
      <ScaleProvider data={data}>
        {children}
        <ScaleHandler onScaleReady={onScaleReady} />
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
        {/* Передаем реальные исторические векторы в HistoricalVectors */}
        <HistoricalVectors
          vectors={historicalVectors}
          startPoint={previousBetEnd}
          totalChainLength={5}
        />
      </ScaleProvider>
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