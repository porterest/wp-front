import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from "lodash.debounce";
import { DebouncedFunc } from 'lodash';

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;
  userPreviousBet: THREE.Vector3;
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number; // предположим 2.5
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
  const [isDragging, setIsDragging] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const userDeposit = 1000;
  const { gl, camera, scene, viewport } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // Для белой линии используем отдельную константу
  const maxWhiteLength = 7;

  const restrictVector = (vector: THREE.Vector3, max: number): THREE.Vector3 => {
    if (vector.length() === 0) return vector;
    return vector.clone().setLength(Math.min(vector.length(), max));
  };

  // const calculateLengthFromBet = (
  //   betAmount: number,
  //   maxBet: number,
  //   maxLength: number
  // ): number => (betAmount / maxBet) * maxLength;

  const debouncedUpdateLine: DebouncedFunc<(v: THREE.Vector3) => void> =
    debounce((newEnd: unknown) => {
      const newEndVector = (newEnd) as THREE.Vector3;
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
    }, 50);


  // Отрисовка линий при первом рендере/изменении зависимостей
  useEffect(() => {
    const betToRender = restrictVector(userPreviousBet, maxWhiteLength);
    const previousBetToRender = restrictVector(previousBetEnd, maxYellowLength);

    // Создаем желтую линию
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

    // Создаем белую линию, только если userPreviousBet не нулевой
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

    // Расположение синего сферического указателя на конце белой линии
    if (sphereRef.current) {
      sphereRef.current.position.copy(spherePosition);
    }

    return () => {
      if (yellowLine.current) scene.remove(yellowLine.current);
      if (dashedLine.current) scene.remove(dashedLine.current);
    };
  }, [scene, previousBetEnd, userPreviousBet]);

  // Пример линий для minY/maxY - вы их используете, оставим как есть
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

    // Считаем координаты мыши
    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);

    const intersection = new THREE.Vector3();
    if (!raycaster.current.ray.intersectPlane(plane.current, intersection)) {
      return;
    }

    // directionYellow отвечает за жёлтую линию
    const directionYellow = new THREE.Vector3().subVectors(
      intersection,
      previousBetEnd
    );
    let distanceYellow = directionYellow.length();

    distanceYellow = Math.min(distanceYellow, maxYellowLength); // max 2.5

    // Создаём новую конечную точку жёлтой линии
    const newEndYellow = previousBetEnd
      .clone()
      .add(directionYellow.setLength(distanceYellow));

    // Ограничение по осям, если нужно
    if (axisMode === "X") {
      newEndYellow.y = previousBetEnd.y;
    } else if (axisMode === "Y") {
      newEndYellow.x = previousBetEnd.x;
    }

    // Теперь аналогично для белой линии, но без ограничения 2.5
    // Берём сырую разницу intersection - previousBetEnd
    // Но уже ограничиваем до 5
    const directionWhite = new THREE.Vector3().subVectors(
      intersection,
      previousBetEnd
    );
    let distanceWhite = directionWhite.length();
    distanceWhite = Math.min(distanceWhite, maxWhiteLength); // max 5
    const newEndWhite = previousBetEnd
      .clone()
      .add(directionWhite.setLength(distanceWhite));

    if (axisMode === "X") {
      newEndWhite.y = previousBetEnd.y;
    } else if (axisMode === "Y") {
      newEndWhite.x = previousBetEnd.x;
    }

    // Вызов handleDrag для внешней логики (например, запись в userPreviousBet)
    // Пусть используем координату белой линии, чтобы userPreviousBet мог быть до 5
    handleDrag(newEndWhite);

    // Рассчитываем длину стрелки на основе депозита (расчёт ставки)
    const percentage = distanceWhite / maxWhiteLength;
    const bet = percentage * userDeposit;
    setBetAmount(Math.min(bet, userDeposit));

    // Обновляем геометрию белой линии (debounce)
    debouncedUpdateLine(newEndWhite);
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

  // В useFrame просто берём ограниченные векторы, чтобы обновить положение линий и сферы
  useFrame(() => {
    if (!isDragging) return;

    // Желтая линия до 2.5
    const clampedYellowEnd = restrictVector(previousBetEnd, maxYellowLength);
    // Белая линия до 5
    const clampedWhiteEnd = restrictVector(userPreviousBet, maxWhiteLength);

    if (yellowLine.current && yellowLine.current.geometry) {
      (yellowLine.current.geometry as LineGeometry).setPositions([
        0,
        0,
        0,
        clampedYellowEnd.x,
        clampedYellowEnd.y,
        clampedYellowEnd.z,
      ]);
    }

    if (dashedLine.current && dashedLine.current.geometry) {
      (dashedLine.current.geometry as LineGeometry).setPositions([
        clampedYellowEnd.x,
        clampedYellowEnd.y,
        clampedYellowEnd.z,
        clampedWhiteEnd.x,
        clampedWhiteEnd.y,
        clampedWhiteEnd.z,
      ]);
    }

    if (sphereRef.current) {
      sphereRef.current.position.copy(clampedWhiteEnd);
    }
  });

  return (
    <>
      {/* Стрелка жёлтого конца */}
      <mesh>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      {/* Стрелка белого конца */}
      <mesh>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Сфера для манипуляций (drag) */}
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
