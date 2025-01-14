import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from "lodash.debounce";
import { DebouncedFunc } from "lodash";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;
  userPreviousBet: THREE.Vector3;
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number;
  axisMode: "X" | "Y";
  handleDrag: (newPosition: THREE.Vector3) => void;
}

const BetLines: React.FC<BetLinesProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             maxYellowLength,
                                             axisMode,
                                             handleDrag,
                                           }) => {
  const { gl, camera, scene, viewport } = useThree();

  const [isDragging, setIsDragging] = useState(false);
  const [betAmount, setBetAmount] = useState(0);

  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  const sphereRef = useRef<THREE.Mesh>(null);
  const yellowLine = useRef<Line2 | null>(null);
  const dashedLine = useRef<Line2 | null>(null);

  // Конусы
  const yellowConeRef = useRef<THREE.Mesh>(null);
  const whiteConeRef = useRef<THREE.Mesh>(null);

  // Для белой линии
  const maxWhiteLength = 7;
  const userDeposit = 1000;

  // Функция-ограничитель
  // const restrictVector = (vector: THREE.Vector3, max: number) => {
  //   if (vector.length() === 0) return vector;
  //   return vector.clone().setLength(Math.min(vector.length(), max));
  // };

  // Debounce для белой линии
  const debouncedUpdateWhiteLine: DebouncedFunc<(end: THREE.Vector3) => void> =
    debounce((endPos) => {
      if (dashedLine.current) {
        const newEndVector = (endPos) as THREE.Vector3;
        const lineGeom = dashedLine.current.geometry as LineGeometry;
        lineGeom.setPositions([
          previousBetEnd.x,
          previousBetEnd.y,
          previousBetEnd.z,
          newEndVector.x,
          newEndVector.y,
          newEndVector.z,
        ]);
      }
    }, 30);

  // Создаём линии один раз при монтировании
  useEffect(() => {
    // Создание жёлтой линии
    const geoYellow = new LineGeometry();
    geoYellow.setPositions([
      0, 0, 0,
      0, 0, 0, // Пока ставим нулевые, обновим позже
    ]);
    const matYellow = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    yellowLine.current = new Line2(geoYellow, matYellow);
    scene.add(yellowLine.current);

    // Создание белой линии (допустим, независимо от userPreviousBet)
    const geoWhite = new LineGeometry();
    geoWhite.setPositions([
      0, 0, 0,
      0, 0, 0,
    ]);
    const matWhite = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    dashedLine.current = new Line2(geoWhite, matWhite);
    scene.add(dashedLine.current);

    // Примерные линии мин/макс Y — оставим, как в коде:
    const minY = 0.1 * viewport.height;
    const maxY = 0.9 * viewport.height;
    const minLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-10, minY, 0),
        new THREE.Vector3(10, minY, 0),
      ])
    );
    const maxLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-10, maxY, 0),
        new THREE.Vector3(10, maxY, 0),
      ])
    );
    scene.add(minLine);
    scene.add(maxLine);

    return () => {
      if (yellowLine.current) scene.remove(yellowLine.current);
      if (dashedLine.current) scene.remove(dashedLine.current);
      scene.remove(minLine);
      scene.remove(maxLine);
    };
  }, [scene, viewport.height]);

  // Проверка нажатия
  const isIntersectingEndpoint = (event: PointerEvent) => {
    if (!sphereRef.current) return false;
    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);
    return raycaster.current.intersectObject(sphereRef.current).length > 0;
  };

  // Динамическая плоскость
  const updateDynamicPlane = () => {
    const cameraDir = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(cameraDir, previousBetEnd);
  };

  // pointerDown
  const handlePointerDown = (event: PointerEvent) => {
    if (isIntersectingEndpoint(event)) {
      updateDynamicPlane();
      setIsDragging(true);
      onDragging(true);
    }
  };

  // pointerMove
  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging) return;

    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);

    const intersection = new THREE.Vector3();
    if (!raycaster.current.ray.intersectPlane(plane.current, intersection)) {
      return;
    }

    // === Желтая линия ===
    const dirY = new THREE.Vector3().subVectors(intersection, previousBetEnd);
    let distY = dirY.length();
    distY = Math.min(distY, maxYellowLength);
    const newEndYellow = previousBetEnd.clone().add(dirY.setLength(distY));

    if (axisMode === "X") {
      newEndYellow.y = previousBetEnd.y;
    } else if (axisMode === "Y") {
      newEndYellow.x = previousBetEnd.x;
    }

    // Обновляем геометрию желтой линии
    if (yellowLine.current) {
      const geo = yellowLine.current.geometry as LineGeometry;
      geo.setPositions([
        0, 0, 0,
        newEndYellow.x, newEndYellow.y, newEndYellow.z,
      ]);
    }

    // Позиция желтого конуса
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(newEndYellow);
      // Повернуть
      const yDir = new THREE.Vector3().subVectors(newEndYellow, new THREE.Vector3(0, 0, 0));
      const up = new THREE.Vector3(0, 1, 0);
      const quatY = new THREE.Quaternion().setFromUnitVectors(up, yDir.normalize());
      yellowConeRef.current.setRotationFromQuaternion(quatY);
    }

    // === Белая линия ===
    const dirW = new THREE.Vector3().subVectors(intersection, previousBetEnd);
    let distW = dirW.length();
    distW = Math.min(distW, maxWhiteLength);
    const newEndWhite = previousBetEnd.clone().add(dirW.setLength(distW));

    if (axisMode === "X") {
      newEndWhite.y = previousBetEnd.y;
    } else if (axisMode === "Y") {
      newEndWhite.x = previousBetEnd.x;
    }

    // Передаём наружу
    handleDrag(newEndWhite);

    // Ставка
    const pct = distW / maxWhiteLength;
    const betVal = pct * userDeposit;
    setBetAmount(Math.min(betVal, userDeposit));

    // Обновляем белую линию (debounced)
    debouncedUpdateWhiteLine(newEndWhite);

    // Сдвигаем сферу
    if (sphereRef.current) {
      sphereRef.current.position.copy(newEndWhite);
    }

    // Поворачиваем белый конус
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(newEndWhite);
      // Смотрим из previousBetEnd в newEndWhite
      const up = new THREE.Vector3(0, 1, 0);
      const wDir = new THREE.Vector3().subVectors(newEndWhite, previousBetEnd);
      const quatW = new THREE.Quaternion().setFromUnitVectors(up, wDir.normalize());
      whiteConeRef.current.setRotationFromQuaternion(quatW);
    }
  };

  // pointerUp
  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);
      onShowConfirmButton(true, {
        amount: betAmount,
        predicted_vector: [userPreviousBet.x, userPreviousBet.y],
      });
    }
  };

  // Навешиваем события
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gl.domElement, handlePointerMove]);

  // В useFrame можно ничего не делать, так как всё происходит в handlePointerMove
  useFrame(() => {});

  return (
    <>
      {/* Жёлтый конус */}
      <mesh ref={yellowConeRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      {/* Белый конус */}
      <mesh ref={whiteConeRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="white" />
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
