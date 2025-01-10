import React, { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ScaleProvider, useScale } from "../context/ScaleContext";
import { ScaleFunctions } from "../types/scale";
import { CandleData } from "../types/candles";
// import { CandleDataContextValue } from "../types/candles";


interface SceneProps {
  children: React.ReactNode;
  orbitControlsEnabled: boolean;
  data: CandleData[];
  onScaleReady: (scaleFunctions: ScaleFunctions) => void; // Callback для передачи функций
}

const Scene: React.FC<SceneProps> = ({ children, orbitControlsEnabled, data, onScaleReady }) => {
  return (
    <Canvas camera={{ position: [10, 10, 10], fov: 60 }}>
      <OrbitControls enableZoom={true} enableRotate={orbitControlsEnabled} enablePan={orbitControlsEnabled} />

      {/* Окружающий свет */}
      <ambientLight intensity={0.5} />

      {/* Направленный свет */}
      <directionalLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow={true}
      />

      <ScaleProvider data={data}>
        {children}
        {/* Вызов ScaleHandler для передачи функций */}
        <ScaleHandler onScaleReady={onScaleReady} />
      </ScaleProvider>
    </Canvas>
  );
};

// Вспомогательный компонент для передачи функций нормализации
const ScaleHandler: React.FC<{ onScaleReady: (scaleFunctions: ScaleFunctions) => void }> = ({ onScaleReady }) => {
  const scaleFunctions = useScale();

  useEffect(() => {
    onScaleReady(scaleFunctions); // Передаём функции вверх через callback
    console.log('new scales');
  }, [onScaleReady, scaleFunctions]);

  return null;
};

export default Scene;
