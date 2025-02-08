// CameraTrackballControl.tsx
import React, { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

const CameraTrackballControl: React.FC = () => {
  const { camera } = useThree();
  const controlRef = useRef<HTMLDivElement>(null);

  // Получаем начальные сферические координаты камеры
  const initialRadius = camera.position.length();
  const initialTheta = Math.atan2(camera.position.z, camera.position.x);
  const initialPhi = Math.acos(camera.position.y / initialRadius);

  // Состояния для углов (theta, phi) — определяют направление камеры
  const [theta, setTheta] = useState(initialTheta);
  const [phi, setPhi] = useState(initialPhi);
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const target = new THREE.Vector3(0, 0, 0); // точка, на которую будет смотреть камера

  // Функция обновления позиции камеры на основе углов theta и phi
  const updateCameraPosition = () => {
    const radius = initialRadius; // можно добавить управление зумом, если нужно
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    camera.position.set(x, y, z);
    camera.lookAt(target);
  };

  // Обновляем позицию камеры при изменении углов
  useEffect(() => {
    updateCameraPosition();
  }, [theta, phi]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    // Чувствительность вращения (подберите по вкусу)
    const sensitivity = 0.005;
    setTheta((prev) => prev - deltaX * sensitivity);
    setPhi((prev) => {
      let newPhi = prev - deltaY * sensitivity;
      // Ограничиваем phi, чтобы избежать переворота камеры
      newPhi = Math.max(0.1, Math.min(Math.PI - 0.1, newPhi));
      return newPhi;
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

  // По двойному клику можно сбросить положение камеры к начальному
  const onDoubleClick = () => {
    setTheta(initialTheta);
    setPhi(initialPhi);
  };

  return (
    <div
      ref={controlRef}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      style={{
        position: "absolute",
        bottom: "80px", // можно настроить по необходимости
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
      <span style={{ color: "#fff", fontSize: "20px" }}>⟳</span>
    </div>
  );
};

export default CameraTrackballControl;
