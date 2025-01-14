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
  maxYellowLength: number; // например 2.5
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
  const yellowLine = useRef<Line2 | null>(null);
  const dashedLine = useRef<Line2 | null>(null);
  const sphereRef = useRef<THREE.Mesh>(null);

  const yellowConeRef = useRef<THREE.Mesh>(null);
  const whiteConeRef = useRef<THREE.Mesh>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const userDeposit = 1000;
  const { gl, camera, scene, viewport } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // Задаем границы куба (от 0 до 7 по каждой оси, если вам нужно другое - меняйте)
  const boundingBox = new THREE.Box3(
    new THREE.Vector3(0, 0, 0), // min
    new THREE.Vector3(5, 5, 5)  // max
  );

  const maxWhiteLength = 7;

  const restrictVector = (vector: THREE.Vector3, max: number): THREE.Vector3 => {
    if (vector.length() === 0) return vector;
    return vector.clone().setLength(Math.min(vector.length(), max));
  };

  const debouncedUpdateLine: DebouncedFunc<(v: THREE.Vector3) => void> = debounce(
    (newEnd) => {
      const newEndVector = newEnd as THREE.Vector3;
      if (dashedLine.current && dashedLine.current.geometry) {
        (dashedLine.current.geometry as LineGeometry).setPositions([
          previousBetEnd.x,
          previousBetEnd.y,
          previousBetEnd.z,
          newEndVector.x,
          newEndVector.y,
          newEndVector.z,
        ]);
      }
    },
    50
  );

  useEffect(() => {
    const betToRender = restrictVector(userPreviousBet, maxWhiteLength);
    const previousBetToRender = restrictVector(previousBetEnd, maxYellowLength);

    // Создаём жёлтую линию
    const yellowLineGeometry = new LineGeometry();
    yellowLineGeometry.setPositions([
      0,
      0,
      0,
      previousBetToRender.x,
      previousBetToRender.y,
      previousBetToRender.z,
    ]);
    const yellowLineMaterial = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    yellowLine.current = new Line2(yellowLineGeometry, yellowLineMaterial);
    scene.add(yellowLine.current);

    // Создаём белую линию
    let spherePosition = previousBetToRender.clone();
    if (!userPreviousBet.equals(new THREE.Vector3(0, 0, 0))) {
      const dashedLineGeometry = new LineGeometry();
      dashedLineGeometry.setPositions([
        previousBetToRender.x,
        previousBetToRender.y,
        previousBetToRender.z,
        betToRender.x,
        betToRender.y,
        betToRender.z,
      ]);
      const dashedLineMaterial = new LineMaterial({
        color: "white",
        linewidth: 3,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      });
      dashedLine.current = new Line2(dashedLineGeometry, dashedLineMaterial);
      scene.add(dashedLine.current);

      spherePosition = betToRender.clone();
    }

    if (sphereRef.current) {
      sphereRef.current.position.copy(spherePosition);
    }

    return () => {
      if (yellowLine.current) scene.remove(yellowLine.current);
      if (dashedLine.current) scene.remove(dashedLine.current);
    };
  }, [scene, previousBetEnd, userPreviousBet]);

  useEffect(() => {
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
      scene.remove(minLine);
      scene.remove(maxLine);
    };
  }, [scene, viewport.height]);

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
    plane.current.setFromNormalAndCoplanarPoint(cameraDirection, previousBetEnd);
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (isIntersectingEndpoint(event)) {
      updateDynamicPlane();
      setIsDragging(true);
      onDragging(true);
    }
  };

  const handlePointerMove = (event: PointerEvent): void => {
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

    // Направление для жёлтой линии
    const directionYellow = intersection.clone().sub(previousBetEnd);
    let distanceYellow = directionYellow.length();
    distanceYellow = Math.min(distanceYellow, maxYellowLength);
    const newEndYellow = previousBetEnd
      .clone()
      .add(directionYellow.setLength(distanceYellow));

    // Учитываем axisMode
    if (axisMode === "X") {
      newEndYellow.y = previousBetEnd.y;
    } else if (axisMode === "Y") {
      newEndYellow.x = previousBetEnd.x;
    }

    // Направление для белой линии
    const directionWhite = intersection.clone().sub(previousBetEnd);
    let distanceWhite = directionWhite.length();
    distanceWhite = Math.min(distanceWhite, maxWhiteLength);
    const newEndWhite = previousBetEnd
      .clone()
      .add(directionWhite.setLength(distanceWhite));

    if (axisMode === "X") {
      newEndWhite.y = previousBetEnd.y;
    } else if (axisMode === "Y") {
      newEndWhite.x = previousBetEnd.x;
    }

    // Ограничиваем в пределах куба (только положительные координаты)
    boundingBox.clampPoint(newEndWhite, newEndWhite);
    boundingBox.clampPoint(newEndYellow, newEndYellow);

    // handleDrag
    handleDrag(newEndWhite);

    // Считаем ставку
    const percentage = distanceWhite / maxWhiteLength;
    const bet = percentage * userDeposit;
    setBetAmount(Math.min(bet, userDeposit));

    // Обновляем белую линию (через debounce)
    debouncedUpdateLine(newEndWhite);

    // Обновляем жёлтую линию
    if (yellowLine.current && yellowLine.current.geometry) {
      (yellowLine.current.geometry as LineGeometry).setPositions([
        0, 0, 0,
        newEndYellow.x,
        newEndYellow.y,
        newEndYellow.z,
      ]);
    }

    // Сферу ставим в конец белой линии
    if (sphereRef.current) {
      sphereRef.current.position.copy(newEndWhite);
    }

    // Поворот и позиция жёлтого конуса
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(newEndYellow);
      const dirY = new THREE.Vector3().subVectors(newEndYellow, new THREE.Vector3(0, 0, 0));
      const up = new THREE.Vector3(0, 1, 0);
      const quaternionY = new THREE.Quaternion().setFromUnitVectors(up, dirY.normalize());
      yellowConeRef.current.setRotationFromQuaternion(quaternionY);
    }

    // Поворот и позиция белого конуса
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(newEndWhite);
      const dirW = new THREE.Vector3().subVectors(newEndWhite, previousBetEnd);
      const up = new THREE.Vector3(0, 1, 0);
      const quaternionW = new THREE.Quaternion().setFromUnitVectors(up, dirW.normalize());
      whiteConeRef.current.setRotationFromQuaternion(quaternionW);
    }
  };

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

  useFrame(() => {
    if (!isDragging) return;
  });

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
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[2.0, 16, 16]} />
          <meshStandardMaterial color="blue" opacity={0} transparent />
        </mesh>
      </mesh>
    </>
  );
};

export default BetLines;
