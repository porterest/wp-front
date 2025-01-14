import React, { useRef, useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from "lodash.debounce";
import { DebouncedFunc } from "lodash";

interface BetLinesProps {
  axisMode: "X" | "Y" | "Z"; // Возможность переключать оси
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxDepositLength: number; // Максимальная длина вектора
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

  // Состояние для вектора депозита
  const [depositPosition, setDepositPosition] = useState<THREE.Vector3>(
    new THREE.Vector3(1, 0, 0) // Изначальное положение
  );

  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  const boundingBox = new THREE.Box3(
    new THREE.Vector3(0, 0, 0), // Минимальные значения
    new THREE.Vector3(7, 7, 7)  // Максимальные значения
  );

  const debouncedUpdateLine: DebouncedFunc<(pos: unknown) => void> = debounce(
    (pos) => {
      const newEndVector = (pos) as THREE.Vector3;
      if (!lineRef.current) return;
      const lineGeom = lineRef.current.geometry as LineGeometry;
      lineGeom.setPositions([0, 0, 0, newEndVector.x, newEndVector.y, newEndVector.z]);
    },
    30
  );

  // Инициализация линии и объектов
  useEffect(() => {
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

    if (coneRef.current) {
      coneRef.current.position.copy(depositPosition);
      const dir = depositPosition.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      coneRef.current.setRotationFromQuaternion(quat);
    }

    if (sphereRef.current) {
      sphereRef.current.position.copy(depositPosition);
    }

    return () => {
      scene.remove(line2);
    };
  }, [scene, depositPosition]);

  // Обновление линии, конуса, и сферы
  useEffect(() => {
    if (!lineRef.current) return;

    boundingBox.clampPoint(depositPosition, depositPosition);
    debouncedUpdateLine(depositPosition.clone());

    if (coneRef.current) {
      coneRef.current.position.copy(depositPosition);
      const dir = depositPosition.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      coneRef.current.setRotationFromQuaternion(quat);
    }

    if (sphereRef.current) {
      sphereRef.current.position.copy(depositPosition);
    }
  }, [depositPosition]);

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

    const newPos = depositPosition.clone();

    // Меняем только текущую ось
    if (axisMode === "X") newPos.x = intersection.x;
    if (axisMode === "Y") newPos.y = intersection.y;
    if (axisMode === "Z") newPos.z = intersection.z;

    // Ограничиваем длину вектора до maxDepositLength
    if (newPos.length() > maxDepositLength) {
      newPos.setLength(maxDepositLength);
    }

    setDepositPosition(newPos);
  };


  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);

      const depositAmount = depositPosition.length();

      onShowConfirmButton(true, {
        amount: depositAmount,
        predicted_vector: [depositPosition.x, depositPosition.y, depositPosition.z], // Передаём predicted_vector
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

  return (
    <>
      {/* Конус на конце стрелки */}
      <mesh ref={coneRef}>
        <coneGeometry args={[0.1, 0.3, 16]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      {/* Сфера (точка перетаскивания) */}
      <mesh ref={sphereRef} scale={[0.5, 0.5, 0.5]}>
        <sphereGeometry args={[1.0, 16, 16]} />
        <meshStandardMaterial color="blue" opacity={0.5} transparent />
      </mesh>
    </>
  );
};

export default BetLines;
