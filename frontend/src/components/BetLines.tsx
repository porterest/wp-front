import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from 'lodash.debounce';

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
  const yellowLine = useRef<Line2 | null>(null);
  const dashedLine = useRef<Line2 | null>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const yellowArrowRef = useRef<THREE.Mesh>(null); //агрегированная ставка
  const dashedArrowRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const userDeposit = 1000; // Example deposit, replace with actual value
  const { gl, camera, scene, viewport } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  const restrictVector = (vector: THREE.Vector3, max: number): THREE.Vector3 => {
    if (vector.length() === 0) return vector;
    return vector.clone().setLength(Math.min(vector.length(), max));
  };

  const calculateLengthFromBet = (
    betAmount: number,
    maxBet: number,
    maxLength: number
  ): number => (betAmount / maxBet) * maxLength;

  const debouncedUpdateLine = debounce((newEnd: THREE.Vector3) => {
    if (dashedLine.current && dashedLine.current.geometry) {
      (dashedLine.current.geometry as LineGeometry).setPositions([
        previousBetEnd.x,
        previousBetEnd.y,
        previousBetEnd.z,
        newEnd.x,
        newEnd.y,
        newEnd.z,
      ]);
    }
  }, 50);


  useEffect(() => {
    const yellowLineGeometry = new LineGeometry();
    const previousBetToRender = restrictVector(previousBetEnd, 2.5);
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

    let spherePosition = previousBetToRender.clone();

    if (!userPreviousBet.equals(new THREE.Vector3(0, 0, 0))) {
      const betToRender = restrictVector(userPreviousBet, 5);
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
      ]),
    );

    const maxLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-10, maxY, 0),
        new THREE.Vector3(10, maxY, 0),
      ]),
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

  const handlePointerDown = (event: PointerEvent) => {
    if (isIntersectingEndpoint(event)) {
      updateDynamicPlane();
      setIsDragging(true);
      onDragging(true);
    }
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!isDragging) return;

    // Определение позиции мыши в координатах WebGL
    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1
    );

    const intersection = new THREE.Vector3();
    raycaster.current.setFromCamera(mouse, camera);
    raycaster.current.ray.intersectPlane(plane.current, intersection);

    // Рассчитываем направление и ограничиваем длину
    const direction = new THREE.Vector3().subVectors(intersection, previousBetEnd);
    let distance = direction.length();
    distance = Math.min(distance, maxYellowLength); // Ограничение длины

    // Создаём новую конечную точку
    const newEnd = previousBetEnd.clone().add(direction.setLength(distance));
    console.log('Текущая длина:', direction.length(), 'Максимальная длина:', maxYellowLength);

    // Ограничение по осям
    if (axisMode === "X") {
      newEnd.y = previousBetEnd.y;
    } else if (axisMode === "Y") {
      newEnd.x = previousBetEnd.x;
    }

    // Вызов handleDrag для обновления внешней логики
    handleDrag(newEnd);

    // Рассчитываем длину стрелки на основе депозита
    const percentage = distance / maxYellowLength;
    const bet = percentage * userDeposit;
    setBetAmount(Math.min(bet, userDeposit));

    // Применяем корректную длину стрелки
    const newLength = calculateLengthFromBet(bet, userDeposit, 5); // Максимальная длина — 5
    userPreviousBet.copy(previousBetEnd.clone().add(direction.setLength(newLength)));

    // Обновляем геометрию белой линии через debounce
    debouncedUpdateLine(newEnd);
  };


  const updateDynamicPlane = () => {
      const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
      plane.current.setFromNormalAndCoplanarPoint(cameraDirection, previousBetEnd);
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
      const clampedYellowEnd = restrictVector(previousBetEnd, 2.5);
      const clampedDashedEnd = userPreviousBet.clone();

      if (yellowLine.current && yellowLine.current.geometry) {
        (yellowLine.current.geometry as LineGeometry).setPositions([
          0, 0, 0,
          clampedYellowEnd.x, clampedYellowEnd.y, clampedYellowEnd.z
        ]);
      }

      if (dashedLine.current && dashedLine.current.geometry) {
        (dashedLine.current.geometry as LineGeometry).setPositions([
          clampedYellowEnd.x, clampedYellowEnd.y, clampedYellowEnd.z,
          clampedDashedEnd.x, clampedDashedEnd.y, clampedDashedEnd.z,
        ]);
      }

      if (sphereRef.current) {
        sphereRef.current.position.copy(clampedDashedEnd);
      }

      if (dashedArrowRef.current) {
        dashedArrowRef.current.position.copy(clampedDashedEnd);
        dashedArrowRef.current.lookAt(clampedDashedEnd);
      }
    });

    return (
      <>
        <mesh ref={yellowArrowRef}>
          <coneGeometry args={[0.1, 0.3, 12]} />
          <meshStandardMaterial color="yellow" />
        </mesh>

        <mesh ref={dashedArrowRef}>
          <coneGeometry args={[0.1, 0.3, 12]} />
          <meshStandardMaterial color="white" />
        </mesh>

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
