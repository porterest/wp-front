// CameraTrackballControl.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei/web/Html";

const CameraTrackballControl: React.FC = () => {
  const { camera } = useThree();
  const controlRef = useRef<HTMLDivElement>(null);

  // Получаем начальные сферические координаты камеры
  const initialRadius = camera.position.length();
  const initialTheta = Math.atan2(camera.position.z, camera.position.x);
  const initialPhi = Math.acos(camera.position.y / initialRadius);

  // Состояния для углов (theta, phi)
  const [theta, setTheta] = useState(initialTheta);
  const [phi, setPhi] = useState(initialPhi);
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const target = new THREE.Vector3(0, 0, 0); // точка, на которую камера смотрит

  // Функция обновления позиции камеры по углам theta и phi
  const updateCameraPosition = useCallback(() => {
    const radius = initialRadius;
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    camera.position.set(x, y, z);
    camera.lookAt(target);
  }, [camera, initialRadius, phi, theta, target]);

  useEffect(() => {
    updateCameraPosition();
  }, [theta, phi, updateCameraPosition]);

  // Функция сброса камеры к начальному положению
  const onDoubleClick = useCallback(() => {
    setTheta(initialTheta);
    setPhi(initialPhi);
    camera.position.set(
      initialRadius * Math.sin(initialPhi) * Math.cos(initialTheta),
      initialRadius * Math.cos(initialPhi),
      initialRadius * Math.sin(initialPhi) * Math.sin(initialTheta)
    );
    camera.lookAt(target);
  }, [camera, initialPhi, initialRadius, initialTheta, target]);

  // Обработчик мыши – если e.detail равен 2, считаем это двойным кликом
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (e.detail === 2) {
      onDoubleClick();
      return; // не начинаем перетаскивание при двойном клике
    }
    setIsDragging(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    const sensitivity = 0.005;
    setTheta((prev) => prev - deltaX * sensitivity);
    setPhi((prev) => {
      const newPhi = prev - deltaY * sensitivity;
      return Math.max(0.1, Math.min(Math.PI - 0.1, newPhi));
    });
  };

  const onMouseUp = () => {
    setIsDragging(false);
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
  }, [isDragging]);

  return (
    <Html fullscreen>
      <div
        ref={controlRef}
        onMouseDown={onMouseDown}
        style={{
          position: "absolute",
          bottom: "80px",
          right: "20px",
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
        {/* Рендерим оси внутри круга */}
        <div
          style={{
            position: "absolute",
            width: "80%",
            height: "2px",
            background: "#00FFFF", // Ось X: бирюзовый
          }}
        />
        <div
          style={{
            position: "absolute",
            height: "80%",
            width: "2px",
            background: "#0000FF", // Ось Y: синий
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "60%",
            height: "60%",
            border: "2px solid #9400D3", // Ось Z: фиолетовый (окружность)
            borderRadius: "50%",
          }}
        />
      </div>
    </Html>
  );
};

export default CameraTrackballControl;
