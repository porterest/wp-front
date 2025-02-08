import React, { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

const CameraTrackballControl: React.FC = () => {
  const { camera } = useThree();
  const controlRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [prevVector, setPrevVector] = useState<THREE.Vector3 | null>(null);
  const radius = 50;

  const getTrackballVector = (
    clientX: number,
    clientY: number,
  ): THREE.Vector3 => {
    if (!controlRef.current) return new THREE.Vector3();
    const rect = controlRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let x = (clientX - centerX) / radius;
    let y = (centerY - clientY) / radius; // инвертируем Y
    const lengthSq = x * x + y * y;
    let z = 0;
    if (lengthSq > 1) {
      const norm = 1 / Math.sqrt(lengthSq);
      x *= norm;
      y *= norm;
      z = 0;
    } else {
      z = Math.sqrt(1 - lengthSq);
    }
    return new THREE.Vector3(x, y, z).normalize();
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const vector = getTrackballVector(e.clientX, e.clientY);
    setPrevVector(vector);
    setIsDragging(true);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging || !prevVector) return;
    const currVector = getTrackballVector(e.clientX, e.clientY);
    const dot = prevVector.dot(currVector);
    const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
    if (angle) {
      const axis = new THREE.Vector3()
        .crossVectors(prevVector, currVector)
        .normalize();
      if (axis.lengthSq() < 1e-6) return;
      const quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle(axis, angle);
      // Обновляем ориентацию камеры, изменяя её quaternion:
      camera.quaternion.premultiply(quaternion);
    }
    setPrevVector(currVector);
  };

  const onMouseUp = () => {
    setIsDragging(false);
    setPrevVector(null);
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
  }, [isDragging, prevVector]);

  return (
    <div
      ref={controlRef}
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        bottom: "80px",
        right: "20px",
        width: `${radius * 2}px`,
        height: `${radius * 2}px`,
        borderRadius: "50%",
        background: "radial-gradient(circle, #4B0082 10%, #000099 90%)",
        cursor: "grab",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ color: "#fff", fontSize: "20px" }}>⟳</span>
    </div>
  );
};

export default CameraTrackballControl;
