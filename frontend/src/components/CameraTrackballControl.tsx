import React, { useEffect, useRef, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei/web/Html";

const CameraTrackballControl: React.FC = () => {
  const { camera } = useThree();
  const controlRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastClickTimeRef = useRef<number>(0);

  // Начальные координаты камеры
  const initialCameraPosition = new THREE.Vector3(10, 10, 10);
  const target = new THREE.Vector3(0, 0, 0);

  const [isDragging, setIsDragging] = useState(false);
  const [cameraResetProgress, setCameraResetProgress] = useState<number | null>(null);

  // Обновляем камеру при двойном клике (с плавной анимацией)
  useFrame(() => {
    if (cameraResetProgress !== null) {
      const t = Math.min(1, cameraResetProgress + 0.05); // Интерполяция
      camera.position.lerpVectors(camera.position, initialCameraPosition, t);
      camera.lookAt(target);

      if (t >= 1) {
        setCameraResetProgress(null);
      } else {
        setCameraResetProgress(t);
      }
    }
  });

  // Начинаем перетаскивание
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
  };

  // Двигаем камеру
  const onPointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    const sensitivity = 0.005;
    camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -deltaX * sensitivity);
    camera.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), -deltaY * sensitivity);
    camera.lookAt(target);
  };

  // Завершаем перетаскивание
  const onPointerUp = () => {
    setIsDragging(false);
    const now = Date.now();
    if (now - lastClickTimeRef.current < 300) {
      setCameraResetProgress(0); // Начинаем сброс камеры
    }
    lastClickTimeRef.current = now;
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    } else {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isDragging]);

  return (
    // Внешний контейнер не перехватывает pointer-события
    <Html fullscreen style={{ pointerEvents: "none" }}>
      {/* Этот элемент управления получает pointer-события */}
      <div
        ref={controlRef}
        onPointerDown={onPointerDown}
        style={{
          pointerEvents: "all",
          position: "absolute",
          bottom: "120px",
          left: "20px",
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #4B0082 10%, #000099 90%)",
          cursor: "grab",
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
        }}
      >
        {/* Внутренние оси */}
        <div style={{ position: "absolute", width: "80%", height: "2px", background: "#00FFFF" }} />
        <div style={{ position: "absolute", height: "80%", width: "2px", background: "#0000FF" }} />
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
    </Html>
  );
};

export default CameraTrackballControl;
