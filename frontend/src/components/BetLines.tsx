import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from "lodash.debounce";
import { fetchUserBalances } from "../services/api";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3; // От сервера: конец жёлтой стрелки
  userPreviousBet: THREE.Vector3; // От сервера: конец белой стрелки
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number;
  maxWhiteLength: number;
  handleDrag: (newPosition: THREE.Vector3) => void;
  axisMode: "X" | "Y";
  setBetAmount: (newAmount: number) => void;
}

const BetLines: React.FC<BetLinesProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             maxYellowLength,
                                             maxWhiteLength,
                                             handleDrag,
                                             axisMode,
                                             setBetAmount,
                                           }) => {
  // --- РЕФЫ для объектов Three.js
  const yellowLineRef = useRef<Line2 | null>(null);
  const whiteLineRef = useRef<Line2 | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const yellowConeRef = useRef<THREE.Mesh | null>(null);
  const whiteConeRef = useRef<THREE.Mesh | null>(null);

  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  console.log("COMPONENT RENDER", {
    previousBetEnd: previousBetEnd.toArray(),
    userPreviousBet: userPreviousBet.toArray(),
    maxWhiteLength,
  });

  // --- Баланс пользователя (для расчёта ставки)
  const [userBalance, setUserBalance] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const { balance } = await fetchUserBalances();
        setUserBalance(balance);
        console.log("User balance loaded:", balance);
      } catch (error) {
        console.error("Failed to fetch user balances:", error);
      }
    })();
  }, []);

  // --- Агрегированный вектор для жёлтой стрелки
  // Вычисляем aggregatorClipped как previousBetEnd, ограниченный по длине maxYellowLength.
  const aggregatorClipped = useRef(new THREE.Vector3());
  useEffect(() => {
    aggregatorClipped.current.copy(previousBetEnd);
    if (aggregatorClipped.current.length() > maxYellowLength) {
      console.log(
        "aggregatorClipped BEFORE LIMIT:",
        aggregatorClipped.current.toArray()
      );
      aggregatorClipped.current.setLength(maxYellowLength);
      console.log(
        "aggregatorClipped AFTER LIMIT:",
        aggregatorClipped.current.toArray()
      );
    } else {
      console.log(
        "aggregatorClipped NOT limited:",
        aggregatorClipped.current.toArray()
      );
    }
  }, [previousBetEnd, maxYellowLength]);

  // --- Инициализация позиции белой стрелки (betPosition)
  // Белая линия будет идти от aggregatorClipped до betPosition.
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(() => {
    const pos = userPreviousBet.clone();
    const offset = pos.clone().sub(aggregatorClipped.current);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      pos.copy(aggregatorClipped.current).add(offset);
      console.log("Initial betPosition limited:", pos.toArray());
    } else {
      console.log("Initial betPosition not limited:", pos.toArray());
    }
    return pos;
  });
  useEffect(() => {
    const pos = userPreviousBet.clone();
    const offset = pos.clone().sub(aggregatorClipped.current);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      pos.copy(aggregatorClipped.current).add(offset);
      console.log("Updated betPosition limited:", pos.toArray());
    } else {
      console.log("Updated betPosition not limited:", pos.toArray());
    }
    setBetPosition(pos);
  }, [userPreviousBet, maxWhiteLength]);

  // --- Debounced функция для обновления геометрии белой линии
  const updateWhiteLine = (pos: THREE.Vector3) => {
    if (whiteLineRef.current && whiteLineRef.current.geometry) {
      const geom = whiteLineRef.current.geometry as LineGeometry;
      console.log(
        "Updating white line geometry: aggregatorClipped:",
        aggregatorClipped.current.toArray(),
        "-> pos:",
        pos.toArray()
      );
      geom.setPositions([
        aggregatorClipped.current.x,
        aggregatorClipped.current.y,
        aggregatorClipped.current.z,
        pos.x,
        pos.y,
        pos.z,
      ]);
      geom.computeBoundingSphere?.();
    }
  };

  // @ts-expect-error meow
  const debouncedUpdateWhiteLine = debounce((pos: THREE.Vector3) => {
      updateWhiteLine(pos);
    },
    15
  ) as (...args: [THREE.Vector3]) => void;

  // --- Создание жёлтой стрелки (линия и конус)
  useEffect(() => {
    console.log("Creating yellow line and cone");
    // Жёлтая линия: от (0,0,0) до aggregatorClipped
    const yGeom = new LineGeometry();
    yGeom.setPositions([
      0,
      0,
      0,
      aggregatorClipped.current.x,
      aggregatorClipped.current.y,
      aggregatorClipped.current.z,
    ]);
    const yMat = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    const yLine = new Line2(yGeom, yMat);
    yellowLineRef.current = yLine;
    scene.add(yLine);
    console.log("Yellow line added:", yLine);

    // Жёлтый конус в конце линии
    const coneGeom = new THREE.ConeGeometry(0.1, 0.3, 12);
    const coneMat = new THREE.MeshStandardMaterial({ color: "yellow" });
    const yCone = new THREE.Mesh(coneGeom, coneMat);
    yCone.position.copy(aggregatorClipped.current);
    console.log("Yellow cone initial position:", aggregatorClipped.current.toArray());
    const dir = aggregatorClipped.current.clone().normalize();
    if (dir.length() > 0) {
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      yCone.setRotationFromQuaternion(quat);
      console.log("Yellow cone rotation set with quaternion:", quat);
    }
    yellowConeRef.current = yCone;
    scene.add(yCone);
    console.log("Yellow cone added:", yCone);

    return () => {
      if (yellowLineRef.current) {
        scene.remove(yellowLineRef.current);
        console.log("Yellow line removed");
      }
      if (yellowConeRef.current) {
        scene.remove(yellowConeRef.current);
        console.log("Yellow cone removed");
      }
    };
  }, [scene]);

  // --- Создание белой стрелки (линия, конус и draggable сфера)
  useEffect(() => {
    console.log("Creating white line, cone and draggable sphere");
    // Белая линия: от aggregatorClipped до betPosition
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      aggregatorClipped.current.x,
      aggregatorClipped.current.y,
      aggregatorClipped.current.z,
      betPosition.x,
      betPosition.y,
      betPosition.z,
    ]);
    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    const wLine = new Line2(wGeom, wMat);
    whiteLineRef.current = wLine;
    scene.add(wLine);
    console.log("White line added:", wLine);

    // Белый конус в конце линии
    const coneGeom = new THREE.ConeGeometry(0.1, 0.3, 12);
    const coneMat = new THREE.MeshStandardMaterial({ color: "white" });
    const wCone = new THREE.Mesh(coneGeom, coneMat);
    wCone.position.copy(betPosition);
    const dirW = betPosition.clone().sub(aggregatorClipped.current).normalize();
    if (dirW.length() > 0) {
      const up = new THREE.Vector3(0, 1, 0);
      const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
      wCone.setRotationFromQuaternion(quatW);
      console.log("White cone rotation set with quaternion:", quatW);
    }
    whiteConeRef.current = wCone;
    scene.add(wCone);
    console.log("White cone added:", wCone);

    // Сфера для перетаскивания
    const sphereGeom = new THREE.SphereGeometry(0.5, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: "blue",
      opacity: 0.5,
      transparent: true,
    });
    const sphereMesh = new THREE.Mesh(sphereGeom, sphereMat);
    sphereMesh.position.copy(betPosition);
    sphereRef.current = sphereMesh;
    scene.add(sphereMesh);
    console.log("Draggable sphere added:", sphereMesh);

    return () => {
      if (whiteLineRef.current) {
        scene.remove(whiteLineRef.current);
        console.log("White line removed");
      }
      if (whiteConeRef.current) {
        scene.remove(whiteConeRef.current);
        console.log("White cone removed");
      }
      if (sphereRef.current) {
        scene.remove(sphereRef.current);
        console.log("Sphere removed");
      }
    };
  }, [scene, betPosition]);

  // --- Обновление белой линии, конуса и сферы при изменении betPosition
  useEffect(() => {
    console.log("Updating white line due to betPosition change:", betPosition.toArray());
    if (whiteLineRef.current && whiteLineRef.current.geometry) {
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        aggregatorClipped.current.x,
        aggregatorClipped.current.y,
        aggregatorClipped.current.z,
        betPosition.x,
        betPosition.y,
        betPosition.z,
      ]);
      geom.computeBoundingSphere?.();
    }
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      const dirW = betPosition.clone().sub(aggregatorClipped.current).normalize();
      if (dirW.length() > 0) {
        const up = new THREE.Vector3(0, 1, 0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }
  }, [betPosition]);

  // --- Drag & Drop логика
  const [isDragging, setIsDragging] = useState(false);

  const isClickOnSphere = useCallback(
    (event: PointerEvent): boolean => {
      if (!sphereRef.current) return false;
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.current.setFromCamera(mouse, camera);
      const intersects = raycaster.current.intersectObject(sphereRef.current);
      console.log("isClickOnSphere:", intersects);
      return intersects.length > 0;
    },
    [gl.domElement, camera]
  );

  const updatePlane = useCallback(() => {
    const camDir = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(camDir, betPosition);
    console.log("Plane updated:", plane.current);
  }, [camera, betPosition]);

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (isClickOnSphere(e)) {
        setIsDragging(true);
        onDragging(true);
        updatePlane();
        console.log("PointerDown: activated dragging");
      }
    },
    [isClickOnSphere, onDragging, updatePlane]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.current.setFromCamera(mouse, camera);
      const intersectPoint = new THREE.Vector3();
      if (!raycaster.current.ray.intersectPlane(plane.current, intersectPoint)) {
        console.log("PointerMove: No intersection with plane");
        return;
      }
      console.log("PointerMove: intersectPoint =", intersectPoint.toArray());
      const direction = intersectPoint.clone().sub(aggregatorClipped.current);
      console.log("PointerMove: direction =", direction.toArray());
      let updatedPos = aggregatorClipped.current.clone().add(direction);
      // Ограничиваем перемещение по нужной оси:
      if (axisMode === "X") {
        updatedPos.y = betPosition.y;
        updatedPos.z = betPosition.z;
      } else if (axisMode === "Y") {
        updatedPos.x = betPosition.x;
        updatedPos.z = betPosition.z;
      }
      const finalDir = updatedPos.clone().sub(aggregatorClipped.current);
      if (finalDir.length() > maxWhiteLength) {
        finalDir.setLength(maxWhiteLength);
        updatedPos = aggregatorClipped.current.clone().add(finalDir);
        console.log("PointerMove: finalDir limited =", finalDir.toArray());
      }
      console.log("PointerMove: updated betPosition =", updatedPos.toArray());
      setBetPosition(updatedPos);
      debouncedUpdateWhiteLine(updatedPos);
      const fraction = finalDir.length() / maxWhiteLength;
      setBetAmount(userBalance * fraction);
      console.log("PointerMove: fraction =", fraction, " => betAmount =", userBalance * fraction);
      handleDrag(updatedPos);
    },
    [
      isDragging,
      gl.domElement,
      camera,
      axisMode,
      betPosition,
      maxWhiteLength,
      userBalance,
      debouncedUpdateWhiteLine,
      setBetAmount,
      handleDrag,
    ]
  );

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);
      const finalDir = betPosition.clone().sub(aggregatorClipped.current);
      const fraction = Math.min(finalDir.length() / maxWhiteLength, 1);
      const betAmt = fraction * userBalance;
      setBetAmount(betAmt);
      console.log(
        "PointerUp: finalDir =",
        finalDir.toArray(),
        "fraction =",
        fraction,
        "betAmt =",
        betAmt
      );
      onShowConfirmButton(true, {
        amount: betAmt,
        predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
      });
    }
  }, [
    isDragging,
    betPosition,
    aggregatorClipped,
    maxWhiteLength,
    userBalance,
    setBetAmount,
    onDragging,
    onShowConfirmButton,
  ]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    console.log("Added pointer event listeners");
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      console.log("Removed pointer event listeners");
    };
  }, [gl.domElement, handlePointerDown, handlePointerMove, handlePointerUp]);

  return null;
};

export default BetLines;
