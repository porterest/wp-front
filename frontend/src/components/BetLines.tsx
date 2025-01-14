import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from "lodash.debounce";
import { DebouncedFunc } from "lodash";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3; // Жёлтая линия (deposit)
  userPreviousBet: THREE.Vector3;
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number; // например 2.5 (но если желтая линия теперь статична, можно не использовать)
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
  // ======== Рефы на линии и меши ========
  const yellowLine = useRef<Line2 | null>(null);
  const dashedLine = useRef<Line2 | null>(null);
  const sphereRef = useRef<THREE.Mesh>(null);

  const yellowConeRef = useRef<THREE.Mesh>(null);
  const whiteConeRef = useRef<THREE.Mesh>(null);

  // ======== Состояния для Drag ========
  const [isDragging, setIsDragging] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const userDeposit = 1000;

  // Две независимые позиции для осей: X и Y
  // При переключении axisMode будет использоваться одна из них
  const [betPositionX, setBetPositionX] = useState<THREE.Vector3>(
    userPreviousBet.clone()
  );
  const [betPositionY, setBetPositionY] = useState<THREE.Vector3>(
    userPreviousBet.clone()
  );

  // three.js контекст
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // Ограничивающий куб (если хотим, чтобы max = 7 по каждой оси)
  const boundingBox = new THREE.Box3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(7, 7, 7)
  );

  // Макс длина белой линии
  const maxWhiteLength = 7;

  // Функция, позволяющая ограничивать длину вектора
  const restrictVector = (vector: THREE.Vector3, max: number): THREE.Vector3 => {
    if (vector.length() === 0) return vector;
    return vector.clone().setLength(Math.min(vector.length(), max));
  };

  // Debounce для белой линии
  const debouncedUpdateLine: DebouncedFunc<(v: THREE.Vector3) => void> =
    debounce((newEndVector: unknown) => {
      const newEnd = (newEndVector) as THREE.Vector3;
      // Обновляем геометрию белой линии
      if (dashedLine.current && dashedLine.current.geometry) {
        (dashedLine.current.geometry as LineGeometry).setPositions([
          // начало белой линии: previousBetEnd
          previousBetEnd.x,
          previousBetEnd.y,
          previousBetEnd.z,
          newEnd.x,
          newEnd.y,
          newEnd.z,
        ]);
      }
    }, 50);

  // ======== ИНИЦИАЛИЗАЦИЯ ЛИНИЙ: жёлтая (deposit) + белая (ставка) ========
  useEffect(() => {
    // Желтая линия — из (0,0,0) в previousBetEnd,
    // либо как в исходном коде: (0,0,0) -> previousBetEnd.
    // Или если хотите из previousBetEnd (но у вас в коде оно вроде 0,0,0 -> previousBetEnd).

    const depositVector = restrictVector(previousBetEnd, maxYellowLength);

    // Создаём геометрию жёлтой линии (СТАТИЧЕСКОЙ)
    const yellowLineGeometry = new LineGeometry();
    yellowLineGeometry.setPositions([
      0, 0, 0,
      depositVector.x,
      depositVector.y,
      depositVector.z
    ]);
    const yellowLineMaterial = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    yellowLine.current = new Line2(yellowLineGeometry, yellowLineMaterial);
    scene.add(yellowLine.current);

    // Ставим желтый конус на конец желтой линии (depositVector)
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(depositVector);
      // Повернём его по направлению от (0,0,0) к depositVector
      const dir = depositVector.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      yellowConeRef.current.setRotationFromQuaternion(quat);
    }

    // Создаём белую линию из previousBetEnd в (X или Y позицию, в зависимости от axisMode)
    // Но мы не знаем, какая сейчас ось при рендере — см.ниже useEffect на axisMode
    // Здесь достаточно лишь инициализировать сам dashedLine
    const dashedLineGeometry = new LineGeometry();
    dashedLineGeometry.setPositions([
      previousBetEnd.x,
      previousBetEnd.y,
      previousBetEnd.z,
      previousBetEnd.x,
      previousBetEnd.y,
      previousBetEnd.z,
    ]);
    const dashedLineMaterial = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    dashedLine.current = new Line2(dashedLineGeometry, dashedLineMaterial);
    scene.add(dashedLine.current);

    return () => {
      if (yellowLine.current) scene.remove(yellowLine.current);
      if (dashedLine.current) scene.remove(dashedLine.current);
    };
  }, [scene, previousBetEnd, maxYellowLength]);

  // Когда axisMode меняется, мы берём соответствующую позицию для белого вектора
  // и обновляем dashedLine + позицию сферы + белого конуса.
  useEffect(() => {
    // currentBetPosition — это либо betPositionX, либо betPositionY
    const currentBetPosition =
      axisMode === "X" ? betPositionX.clone() : betPositionY.clone();

    // Обновляем белую линию
    if (dashedLine.current && dashedLine.current.geometry) {
      (dashedLine.current.geometry as LineGeometry).setPositions([
        previousBetEnd.x,
        previousBetEnd.y,
        previousBetEnd.z,
        currentBetPosition.x,
        currentBetPosition.y,
        currentBetPosition.z,
      ]);
    }

    // Сфера
    if (sphereRef.current) {
      sphereRef.current.position.copy(currentBetPosition);
    }

    // Белый конус
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(currentBetPosition);
      // Направление от previousBetEnd к currentBetPosition
      const dirW = currentBetPosition.clone().sub(previousBetEnd).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quaternionW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
      whiteConeRef.current.setRotationFromQuaternion(quaternionW);
    }
  }, [axisMode, betPositionX, betPositionY, previousBetEnd]);

  // ======== Вспомогательные методы для Raycaster ========
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

  // ======== Pointer Events ========
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

    // Направление от previousBetEnd
    const directionWhite = intersection.clone().sub(previousBetEnd);
    let distanceWhite = directionWhite.length();
    distanceWhite = Math.min(distanceWhite, maxWhiteLength);

    // Новый конец (белая линия)
    const newEndWhite = previousBetEnd
      .clone()
      .add(directionWhite.setLength(distanceWhite));

    // Ограничиваем по axisMode
    if (axisMode === "X") {
      newEndWhite.y = previousBetEnd.y;
      // если ось X, то Y остаётся как у previousBetEnd
      // Z оставляем? если нужно, можно принудительно newEndWhite.z = ...
    } else if (axisMode === "Y") {
      newEndWhite.x = previousBetEnd.x;
      // Z оставляем?
    }

    // Ограничиваем в пределах куба
    boundingBox.clampPoint(newEndWhite, newEndWhite);

    // Сохраняем ставку (betAmount) как процент
    const percentage = distanceWhite / maxWhiteLength;
    const bet = percentage * userDeposit;
    setBetAmount(Math.min(bet, userDeposit));

    // Запоминаем позицию в нужном стейте:
    if (axisMode === "X") {
      setBetPositionX(newEndWhite.clone());
    } else {
      setBetPositionY(newEndWhite.clone());
    }

    // handleDrag
    handleDrag(newEndWhite);

    // Обновляем белую линию (debounce)
    debouncedUpdateLine(newEndWhite);

    // Сферу
    if (sphereRef.current) {
      sphereRef.current.position.copy(newEndWhite);
    }

    // Белый конус
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(newEndWhite);
      const dirW = newEndWhite.clone().sub(previousBetEnd).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quaternionW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
      whiteConeRef.current.setRotationFromQuaternion(quaternionW);
    }
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);
      onShowConfirmButton(true, {
        amount: betAmount,
        // Можно отдать текущий вектор
        predicted_vector: [sphereRef.current?.position.x ?? 0, sphereRef.current?.position.y ?? 0],
      });
    }
  };

  // Навешиваем и снимаем обработчики
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
    // Ничего не делаем в анимационном цикле,
    // всё обновление во время handlePointerMove
  });

  return (
    <>
      {/* Жёлтый конус (СТАТИЧЕСКИЙ, стоит на конце жёлтой линии) */}
      <mesh ref={yellowConeRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      {/* Белый конус (ДВИЖЕТСЯ вместе с белым вектором) */}
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
