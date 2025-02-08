// ResetCameraOnDoubleClick.tsx
import { useThree } from "@react-three/fiber";
import React, { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

const ResetCameraOnDoubleClick: React.FC = () => {
  const { camera } = useThree();
  const initialPosition = useRef(new THREE.Vector3());
  const initialQuaternion = useRef(new THREE.Quaternion());

  // Сохраняем исходные параметры камеры при монтировании компонента
  useEffect(() => {
    initialPosition.current.copy(camera.position);
    initialQuaternion.current.copy(camera.quaternion);
  }, [camera]);

  const onDoubleClick = useCallback(() => {
    camera.position.copy(initialPosition.current);
    camera.quaternion.copy(initialQuaternion.current);
    camera.updateProjectionMatrix();
  }, [camera]);

  useEffect(() => {
    // Слушаем событие dblclick на window (оно должно срабатывать во всех браузерах)
    window.addEventListener("dblclick", onDoubleClick);
    return () => {
      window.removeEventListener("dblclick", onDoubleClick);
    };
  }, [onDoubleClick]);

  return null;
};

export default ResetCameraOnDoubleClick;
