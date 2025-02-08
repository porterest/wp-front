import React, { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
// import { OrbitControls } from "@react-three/drei";
import { ScaleProvider, useScale } from "../context/ScaleContext";
import { ScaleFunctions } from "../types/scale";
import { CandleData } from "../types/candles";
import * as THREE from "three";


interface SceneProps {
  children: React.ReactNode;
  data: CandleData[];
  onScaleReady: (scaleFunctions: ScaleFunctions) => void;
  style?: React.CSSProperties;
}

const RotatingGraph: React.FC<{ isRotating: boolean; children: React.ReactNode }> = ({ isRotating, children }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (isRotating && groupRef.current) {
      // Вращаем группу вокруг оси Y
      groupRef.current.rotation.y += 0.01;
    }
  });

  return <group ref={groupRef}>{children}</group>;
};

const Scene: React.FC<SceneProps> = ({ children, data, onScaleReady }) => {
  const [isRotating, setIsRotating] = useState(false);

  return (
    <>
      <Canvas camera={{ position: [10, 10, 10], fov: 60 }}>
        {/* Можно отключить встроенное управление вращением */}
        {/*<OrbitControls enableRotate={false} enablePan={false} enableZoom={false} />*/}

        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} castShadow />

        <ScaleProvider data={data}>
          <RotatingGraph isRotating={isRotating}>
            {children}
          </RotatingGraph>
          <ScaleHandler onScaleReady={onScaleReady} />
        </ScaleProvider>
      </Canvas>

      {/* Кружочек в углу для управления вращением */}
      <div
        onClick={() => setIsRotating((prev) => !prev)}
        style={{
          position: "absolute",
          bottom: "60px",
          right: "20px",
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {isRotating ? "Стоп" : "Вращать"}
      </div>
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

export default Scene;
