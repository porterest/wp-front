import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from "lodash.debounce";
import { DebouncedFunc } from "lodash";

// Расширяем до "X" | "Y" | "Z"
interface BetLinesProps {
  axisMode: "X" | "Y" | "Z";
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; vector: number[] }
  ) => void;
  // Макс длина (при желании, если нужно)
  maxDepositLength: number;
}

const BetLines: React.FC<BetLinesProps> = ({
                                             axisMode,
                                             onDragging,
                                             onShowConfirmButton,
                                             maxDepositLength,
                                           }) => {
  const lineRef = useRef<Line2 | null>(null);
  const coneRef = useRef<THREE.Mesh>(null);
  const sphereRef = useRef<THREE.Mesh>(null);

  const [isDragging, setIsDragging] = useState(false);

  // Храним ВЕСЬ вектор депозита (стрелка от (0,0,0) до depositPosition)
  // Изначально пусть будет (2,1,3), или (1,0,0) - как вам нужно
  const [depositPosition, setDepositPosition] = useState(() => new THREE.Vector3(1,0,0));

  // three.js
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // BoundingBox для ограничения (при необходимости)
  const boundingBox = new THREE.Box3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(7, 7, 7)
  );

  // Debounce для обновления линии
  const debouncedUpdateLine: DebouncedFunc<(pos: THREE.Vector3) => void> = debounce(
    (pos) => {
      if (!lineRef.current) return;
      const lineGeom = lineRef.current.geometry as LineGeometry;
      // Линия от (0,0,0) до depositPosition
      lineGeom.setPositions([
        0, 0, 0,
        pos.x, pos.y, pos.z,
      ]);
    },
    30
  );

  // Инициируем линию (единственная стрелка)
  useEffect(() => {
    // Создаём геометрию
    const lineGeom = new LineGeometry();
    lineGeom.setPositions([0, 0, 0, depositPosition.x, depositPosition.y, depositPosition.z]);

    const lineMat = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });

    const line2 = new Line2(lineGeom, lineMat);
    lineRef.current = line2;
    scene.add(line2);

    // Конус на конце
    if (coneRef.current) {
      coneRef.current.position.copy(depositPosition);
      const dir = depositPosition.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      coneRef.current.setRotationFromQuaternion(quat);
    }

    // Сфера на конце
    if (sphereRef.current) {
      sphereRef.current.position.copy(depositPosition);
    }

    return () => {
      scene.remove(line2);
    };
  }, [scene]);

  // При изменении depositPosition обновляем линию, конус, сферу
  useEffect(() => {
    if (!lineRef.current) return;

    // clampLength, если хотите ограничить максимальную длину
    if (depositPosition.length() > maxDepositLength) {
      depositPosition.setLength(maxDepositLength);
    }

    // Bounding box
    boundingBox.clampPoint(depositPosition, depositPosition);

    // Обновляем линию (debounce)
    debouncedUpdateLine(depositPosition.clone());

    // Поворот и позиция конуса
    if (coneRef.current) {
      coneRef.current.position.copy(depositPosition);
      const dir = depositPosition.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      coneRef.current.setRotationFromQuaternion(quat);
    }

    // Сферу
    if (sphereRef.current) {
      sphereRef.current.position.copy(depositPosition);
    }
  }, [depositPosition, maxDepositLength]);

  // PointerEvents
  const isIntersectingEndpoint = (event: PointerEvent): boolean => {
    if (!sphereRef.current) return false;
    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);
    return raycaster.current.intersectObject(sphereRef.current).length > 0;
  };

  const updateDynamicPlane = () => {
    const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(cameraDirection, new THREE.Vector3(0, 0, 0));
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (isIntersectingEndpoint(event)) {
      updateDynamicPlane();
      setIsDragging(true);
      onDragging(true);
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging) return;

    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);

    const intersection = new THREE.Vector3();
    if (!raycaster.current.ray.intersectPlane(plane.current, intersection)) return;

    // Это абсолютная позиция в пространстве. Нам нужно движение вдоль одной оси.
    // Берём копию текущего depositPosition и корректируем только нужную ось.
    const newPos = depositPosition.clone();

    if (axisMode === "X") {
      newPos.x = intersection.x;
    } else if (axisMode === "Y") {
      newPos.y = intersection.y;
    } else if (axisMode === "Z") {
      newPos.z = intersection.z;
    }

    setDepositPosition(newPos);
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);

      // Считаем депозит как длину
      const depositAmount = depositPosition.length();
      onShowConfirmButton(true, {
        amount: depositAmount,
        vector: [depositPosition.x, depositPosition.y, depositPosition.z],
      });
    }
  };

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove]);

  useFrame(() => {
    // Ничего особого в рендер-цикле
  });

  return (
    <>
      {/* Конус на конце */}
      <mesh ref={coneRef}>
        <coneGeometry args={[0.1, 0.3, 16]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      {/* Сфера (drag point) */}
      <mesh ref={sphereRef} scale={[0.5, 0.5, 0.5]}>
        <sphereGeometry args={[1.0, 16, 16]} />
        <meshStandardMaterial color="blue" opacity={0.5} transparent />
      </mesh>
    </>
  );
};

export default BetLines;
