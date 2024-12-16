import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

interface SceneProps {
  children: React.ReactNode;
  orbitControlsEnabled: boolean;
}

const Scene: React.FC<SceneProps> = ({ children, orbitControlsEnabled }) => {
  return (
    <Canvas camera={{ position: [10, 10, 10], fov: 60 }}>
      {/* Управление камерой */}
      <OrbitControls
        enableZoom={true}
        enableRotate={orbitControlsEnabled}
        enablePan={orbitControlsEnabled}
      />

      {/* Окружающий свет */}
      <ambientLight intensity={0.5} />

      {/* Направленный свет */}
      <directionalLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow={true}
      />

      {/* Дети компонента */}
      {children}
    </Canvas>
  );
};

export default Scene;
