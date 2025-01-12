import React, { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { Text } from "@react-three/drei";
import { useUserBalance } from "../pages/BalancePage";
import { fetchPreviousBetEnd } from "../services/api";
// import { data } from "autoprefixer";

interface BetArrowProps {
  previousBetEnd: THREE.Vector3;
  userPreviousBet: THREE.Vector3;
  setUserPreviousBet: (value: THREE.Vector3) => void;
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] },
  ) => void;
  axisMode: "X" | "Y";
  pairId: string | undefined;
}

const BetArrow: React.FC<BetArrowProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             setUserPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             axisMode,
                                             pairId
                                           }) => {
  const endpointRef = useRef<THREE.Mesh>(null); // Сфера на конце стрелки (для перемещения)
  const yellowLine = useRef<Line2 | null>(null); // Линия для жёлтой стрелки
  const dashedLine = useRef<Line2 | null>(null); // Линия для пунктирной стрелки
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster()); // Raycaster для обнаружения кликов
  const plane = useRef(new THREE.Plane()); // Плоскость для ограничения движения
  const [xValue, setXValue] = useState(userPreviousBet.x); // Позиция X
  const [yValue, setYValue] = useState(userPreviousBet.y); // Позиция Y
  const [betAmount, setBetAmount] = useState(0); // Размер ставки
  const [fetchedData, setFetchedData] = useState<[number, number] | null>(null);


  // Копируем начальную позицию предыдущей ставки
  const fixedPreviousBetEnd = previousBetEnd.clone(); // Конец жёлтой линии
  const dashedLineStart = fixedPreviousBetEnd.clone(); // Начало пунктирной линии

  // Состояния для координат, суммы ставки и статуса перетаскивания

  const [isDragging, setIsDragging] = useState(false); // Флаг перетаскивания

  const { userData } = useUserBalance(); // Данные о балансе пользователя
  const userDeposit = userData?.balance || 0; // Берём баланс из контекста

  const maxArrowLength = 5; // Максимальная длина стрелки

  const handlePointerUp = () => {
    if (isDragging) {
      console.log("Pointer up: calling onShowConfirmButton");
      // Передаем данные текущей ставки
      onShowConfirmButton(true, {
        amount: betAmount, // Сумма ставки
        predicted_vector: [xValue, yValue], // Вектор на основе текущей позиции
      });

      setIsDragging(false); // Завершаем перетаскивание
      onDragging(false); // Сообщаем родительскому компоненту
      // Обновляем состояние предыдущей ставки
      setUserPreviousBet(new THREE.Vector3(xValue, yValue, dashedLineStart.z));
    }
  };

  const yellowArrowRef = useRef<THREE.Mesh>(null); // Конус для желтой стрелки
  const dashedArrowRef = useRef<THREE.Mesh>(null); // Конус для белой стрелки

  const isIntersectingEndpoint = (event: PointerEvent) => {
    if (!endpointRef.current) return false;

    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1,
    );

    raycaster.current.setFromCamera(mouse, camera);
    const intersects = raycaster.current.intersectObject(endpointRef.current!);

    return intersects.length > 0; // Возвращаем true, если пересечение найдено
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
      -(event.clientY / gl.domElement.clientHeight) * 2 + 1,
    );

    const intersection = new THREE.Vector3();
    raycaster.current.setFromCamera(mouse, camera);
    raycaster.current.ray.intersectPlane(plane.current, intersection);

    const direction = new THREE.Vector3().subVectors(
      intersection,
      fixedPreviousBetEnd,
    );
    let distance = direction.length();

    if (distance > maxArrowLength) {
      distance = maxArrowLength;
      direction.setLength(maxArrowLength);
    }

    const newEnd = fixedPreviousBetEnd.clone().add(direction);

    if (axisMode === "X") {
      setXValue(newEnd.x);
    } else if (axisMode === "Y") {
      setYValue(newEnd.y);
    }

    const percentage = distance / maxArrowLength;
    const bet = percentage * userDeposit;

    setBetAmount(Math.min(bet, userDeposit));
  };

  const updateDynamicPlane = () => {
    const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(
      cameraDirection,
      fixedPreviousBetEnd,
    );
  };

  // useEffect(() => {
  //   // Создаём жёлтую линию
  //   const yellowLineGeometry = new LineGeometry();
  //   const yellowLineMaterial = new LineMaterial({
  //     color: "yellow",
  //     linewidth: 3, // Толщина линии
  //     resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
  //   });
  //
  //   yellowLine.current = new Line2(yellowLineGeometry, yellowLineMaterial);
  //   scene.add(yellowLine.current);
  //
  //   // Создаём пунктирную линию
  //   const dashedLineGeometry = new LineGeometry();
  //   const dashedLineMaterial = new LineMaterial({
  //     color: "white",
  //     linewidth: 3,
  //     resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
  //   });
  //
  //   dashedLine.current = new Line2(dashedLineGeometry, dashedLineMaterial);
  //   scene.add(dashedLine.current);
  //
  //   return () => {
  //     if (yellowLine.current) scene.remove(yellowLine.current);
  //     if (dashedLine.current) scene.remove(dashedLine.current);
  //   };
  // }, [scene]);

  useEffect(() => {
    const yellowLineGeometry = new LineGeometry();
    yellowLineGeometry.setPositions([
      0, 0, 0,
      previousBetEnd.x, previousBetEnd.y, previousBetEnd.z,
    ]);
    yellowLineGeometry.computeBoundingBox();
    yellowLineGeometry.computeBoundingSphere();
    yellowLineGeometry.attributes.position.needsUpdate = true;

    const yellowLineMaterial = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });

    const yellowLineInstance = new Line2(yellowLineGeometry, yellowLineMaterial);
    yellowLine.current = yellowLineInstance;
    scene.add(yellowLineInstance);

    const dashedLineGeometry = new LineGeometry();
    dashedLineGeometry.setPositions([
      previousBetEnd.x, previousBetEnd.y, previousBetEnd.z,
      previousBetEnd.x, previousBetEnd.y, previousBetEnd.z,
    ]);
    dashedLineGeometry.computeBoundingBox();
    dashedLineGeometry.computeBoundingSphere();
    dashedLineGeometry.attributes.position.needsUpdate = true;

    const dashedLineMaterial = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });

    const dashedLineInstance = new Line2(dashedLineGeometry, dashedLineMaterial);
    dashedLine.current = dashedLineInstance;
    scene.add(dashedLineInstance);

    return () => {
      scene.remove(yellowLineInstance);
      scene.remove(dashedLineInstance);
    };
  }, [scene, previousBetEnd]);

  useEffect(() => {
    const updateLinePosition = async () => {
      if (!pairId) {
        console.warn("Pair ID is not provided. Skipping fetchPreviousBetEnd.");
        return;
      }

      try {
        const data = await fetchPreviousBetEnd(pairId);
        const newPosition = new THREE.Vector3(data[0], data[1], previousBetEnd.z);
        setUserPreviousBet(newPosition);
        setFetchedData([data[0], data[1]]);

        if (yellowLine.current) {
          yellowLine.current.geometry.setPositions([0, 0, 0, data[0], data[1], previousBetEnd.z]);
          yellowLine.current.geometry.attributes.position.needsUpdate = true;
        }

        if (dashedLine.current) {
          dashedLine.current.geometry.setPositions([
            data[0], data[1], previousBetEnd.z,
            previousBetEnd.x, previousBetEnd.y, previousBetEnd.z,
          ]);
          dashedLine.current.geometry.attributes.position.needsUpdate = true;
        }
      } catch (error) {
        console.error("Failed to fetch previous bet end:", error);
      }
    };

    updateLinePosition();
  }, [pairId, previousBetEnd]);

  useFrame(() => {
    if (!fetchedData) return; // Проверяем, что данные загружены

    const [dataX, dataY] = fetchedData;

    // Обновляем позицию и ориентацию жёлтого конуса
    if (yellowArrowRef.current) {
      yellowArrowRef.current.position.set(
        fixedPreviousBetEnd.x,
        fixedPreviousBetEnd.y,
        fixedPreviousBetEnd.z,
      );

      const direction = new THREE.Vector3()
        .subVectors(fixedPreviousBetEnd, new THREE.Vector3(0, 0, 0))
        .normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction,
      );
      yellowArrowRef.current.setRotationFromQuaternion(quaternion);
      yellowArrowRef.current.updateMatrix();
    }

    // Обновляем позицию и ориентацию белого конуса
    if (dashedArrowRef.current) {
      dashedArrowRef.current.position.set(dataX, dataY, dashedLineStart.z);

      const direction = new THREE.Vector3()
        .subVectors(
          new THREE.Vector3(xValue, yValue, dashedLineStart.z),
          dashedLineStart,
        )
        .normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction,
      );
      dashedArrowRef.current.setRotationFromQuaternion(quaternion);
      dashedArrowRef.current.updateMatrix();
    }

    // Обновляем геометрию жёлтой линии
    const yellowLinePositions = [0, 0, 0, dataX, dataY, previousBetEnd.z];
    if (yellowLine.current?.geometry) {
      yellowLine.current.geometry.setPositions(yellowLinePositions);
      yellowLine.current.geometry.attributes.position.needsUpdate = true;
    }

    console.log("координаты для жёлтой линии");
    console.log(yellowLinePositions);
    console.log(0, 0, 0, dataX, dataY, previousBetEnd.z);

    // Обновляем геометрию пунктирной линии
    const dashedLinePositions = [
      dataX, dataY, previousBetEnd.z,
      previousBetEnd.x, previousBetEnd.y, previousBetEnd.z,
    ];
    if (dashedLine.current?.geometry) {
      dashedLine.current.geometry.setPositions(dashedLinePositions);
      dashedLine.current.geometry.attributes.position.needsUpdate = true;
    }

    console.log("геометрия пунктирной линии");
    console.log(dashedLinePositions);
    console.log(dataX, dataY, previousBetEnd.z,
      previousBetEnd.x, previousBetEnd.y, previousBetEnd.z);
  });


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
  }, [gl.domElement, isDragging, axisMode]);


  useFrame(() => {
    if (!fetchedData) return; // Проверяем, что данные загружены

    const [dataX, dataY] = fetchedData; // Получаем координаты из состояния

    updateDynamicPlane();

    // Обновляем геометрию жёлтой линии
    const yellowLinePositions = [0, 0, 0, dataX, dataY, previousBetEnd.z];
    yellowLine.current?.geometry.setPositions(yellowLinePositions);
    console.log("геометрию жёлтой линии");
    console.log(yellowLinePositions);
    console.log(0, 0, 0, dataX, dataY, previousBetEnd.z);
    // Обновляем геометрию пунктирной линии
    const dashedLinePositions = [
      dataX, dataY, previousBetEnd.z,
      previousBetEnd.x, previousBetEnd.y, previousBetEnd.z,
    ];
    console.log("геометрия пунктирной линии");
    console.log(dashedLinePositions);
    dashedLine.current?.geometry.setPositions(dashedLinePositions);
  });


  return (
    <>
      {/* Текст депозита */}
      <Text
        position={[
          fixedPreviousBetEnd.x,
          fixedPreviousBetEnd.y + 1,
          fixedPreviousBetEnd.z,
        ]}
        fontSize={0.3}
        color="lightgreen"
        anchorX="center"
        anchorY="middle"
      >
        Deposit: ${userDeposit.toFixed(2)}
      </Text>
      {/* Текст ставки */}
      <Text
        position={[xValue + 0.5, yValue + 1, dashedLineStart.z + 0.5]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Bet: ${betAmount.toFixed(2)}
      </Text>
      {/* Жёлтый конус (стрелка) */}
      <mesh ref={yellowArrowRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>
       Белый конус (стрелка)
      <mesh ref={dashedArrowRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="white" />
      </mesh>
       Сфера на конце стрелки
      <mesh ref={endpointRef} position={[xValue, yValue, dashedLineStart.z]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="blue" opacity={0} transparent />
      </mesh>
    </>
  );
};

export default BetArrow;

