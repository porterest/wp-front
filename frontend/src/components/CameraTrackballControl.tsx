import React, { useEffect, useRef, useState, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei/web/Html";

const CameraTrackballControl: React.FC = () => {
  const { camera } = useThree();
  const controlRef = useRef<HTMLDivElement>(null);

  // Начальные сферические координаты камеры
  const initialRadius = camera.position.length();
  const initialTheta = Math.atan2(camera.position.z, camera.position.x);
  const initialPhi = Math.acos(camera.position.y / initialRadius);

  // Состояния для углов (theta, phi)
  const [theta, setTheta] = useState(initialTheta);
  const [phi, setPhi] = useState(initialPhi);
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Для детекции двойного клика: запоминаем время последнего pointerUp
  const lastClickTimeRef = useRef<number>(0);
  const DOUBLE_CLICK_THRESHOLD = 300; // миллисекунд

  const target = new THREE.Vector3(0, 0, 0); // точка, на которую камера смотрит

  // Функция обновления позиции камеры на основе углов theta и phi
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
  const resetCamera = useCallback(() => {
    setTheta(initialTheta);
    setPhi(initialPhi);
    camera.position.set(
      initialRadius * Math.sin(initialPhi) * Math.cos(initialTheta),
      initialRadius * Math.cos(initialPhi),
      initialRadius * Math.sin(initialPhi) * Math.sin(initialTheta)
    );
    camera.lookAt(target);
  }, [camera, initialPhi, initialRadius, initialTheta, target]);

  // Обработчик pointerDown: начинаем перетаскивание
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
  };

  // Обработчик pointerMove: обновляем углы на основе перемещения мыши
  const onPointerMove = (e: PointerEvent) => {
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

  // Обработчик pointerUp: заканчиваем перетаскивание и проверяем двойной клик
  const onPointerUp = () => {
    setIsDragging(false);
    const now = Date.now();
    if (now - lastClickTimeRef.current < DOUBLE_CLICK_THRESHOLD) {
      // Двойной клик: сбрасываем камеру
      resetCamera();
      lastClickTimeRef.current = 0;
    } else {
      lastClickTimeRef.current = now;
    }
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
    <Html fullscreen>
      <div
        ref={controlRef}
        onPointerDown={onPointerDown}
        style={{
          position: "absolute",
          bottom: "120px", // как у вас задано
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
