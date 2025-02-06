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
  previousBetEnd: THREE.Vector3; // Конечная точка жёлтой линии (от бэка)
  userPreviousBet: THREE.Vector3; // Конечная точка белой линии (от бэка)
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
  // Ссылки на объекты Three.js
  const yellowLineRef = useRef<Line2 | null>(null);
  const whiteLineRef = useRef<Line2 | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const yellowConeRef = useRef<THREE.Mesh | null>(null);
  const whiteConeRef = useRef<THREE.Mesh | null>(null);

  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // Загружаем баланс пользователя
  const [userBalance, setUserBalance] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const { balance } = await fetchUserBalances();
        setUserBalance(balance);
      } catch (error) {
        console.error("Failed to fetch user balances:", error);
      }
    })();
  }, []);

  // Вычисляем агрегированный вектор для жёлтой линии (от начала до previousBetEnd),
  // при этом ограничивая его длину по maxYellowLength.
  const aggregatorClipped = useRef(new THREE.Vector3());
  useEffect(() => {
    aggregatorClipped.current.copy(previousBetEnd);
    if (aggregatorClipped.current.length() > maxYellowLength) {
      aggregatorClipped.current.setLength(maxYellowLength);
    }
  }, [previousBetEnd, maxYellowLength]);

  // Белая линия должна идти от aggregatorClipped до betPosition.
  // При инициализации (и при обновлении userPreviousBet) ограничиваем длину смещения не более maxWhiteLength.
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(() => {
    const pos = userPreviousBet.clone();
    const offset = pos.clone().sub(aggregatorClipped.current);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      pos.copy(aggregatorClipped.current).add(offset);
    }
    return pos;
  });
  useEffect(() => {
    const pos = userPreviousBet.clone();
    const offset = pos.clone().sub(aggregatorClipped.current);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      pos.copy(aggregatorClipped.current).add(offset);
    }
    setBetPosition(pos);
  }, [userPreviousBet, maxWhiteLength]);

  // Обновление геометрии белой линии с debounce
  const updateWhiteLine = (pos: THREE.Vector3) => {
    if (whiteLineRef.current && whiteLineRef.current.geometry) {
      const geom = whiteLineRef.current.geometry as LineGeometry;
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

  // Создаём жёлтую линию и конус
  useEffect(() => {
    // Жёлтая линия: от (0,0,0) до aggregatorClipped
    const yGeom = new LineGeometry();
    yGeom.setPositions([
      0, 0, 0,
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

    // Жёлтый конус в конце жёлтой линии
    const coneGeom = new THREE.ConeGeometry(0.1, 0.3, 12);
    const coneMat = new THREE.MeshStandardMaterial({ color: "yellow" });
    const yCone = new THREE.Mesh(coneGeom, coneMat);
    yCone.position.copy(aggregatorClipped.current);
    const dir = aggregatorClipped.current.clone().normalize();
    if (dir.length() > 0) {
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      yCone.setRotationFromQuaternion(quat);
    }
    yellowConeRef.current = yCone;
    scene.add(yCone);

    return () => {
      if (yellowLineRef.current) scene.remove(yellowLineRef.current);
      if (yellowConeRef.current) scene.remove(yellowConeRef.current);
    };
  }, [scene]);

  // Создаём белую линию, конус и сферу (точку для перетаскивания)
  useEffect(() => {
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

    // Белый конус в конце белой линии
    const coneGeom = new THREE.ConeGeometry(0.1, 0.3, 12);
    const coneMat = new THREE.MeshStandardMaterial({ color: "white" });
    const wCone = new THREE.Mesh(coneGeom, coneMat);
    wCone.position.copy(betPosition);
    const dirW = betPosition.clone().sub(aggregatorClipped.current).normalize();
    if (dirW.length() > 0) {
      const up = new THREE.Vector3(0, 1, 0);
      const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
      wCone.setRotationFromQuaternion(quatW);
    }
    whiteConeRef.current = wCone;
    scene.add(wCone);

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

    return () => {
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
      if (whiteConeRef.current) scene.remove(whiteConeRef.current);
      if (sphereRef.current) scene.remove(sphereRef.current);
    };
  }, [scene, betPosition]);

  // При изменении betPosition обновляем геометрию белой линии, положение конуса и сферы
  useEffect(() => {
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

  // --- DRAG & DROP ---
  const [isDragging, setIsDragging] = useState(false);

  // Проверяем, кликнул ли пользователь по сфере (точке для перетаскивания)
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
      return intersects.length > 0;
    },
    [gl.domElement, camera]
  );

  // Обновляем плоскость для расчёта пересечения (плоскость перпендикулярна направлению камеры и проходит через betPosition)
  const updatePlane = useCallback(() => {
    const camDir = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(camDir, betPosition);
  }, [camera, betPosition]);

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (isClickOnSphere(e)) {
        setIsDragging(true);
        onDragging(true);
        updatePlane();
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
        return;
      }
      // Вычисляем новое положение относительно aggregatorClipped
      const direction = intersectPoint.clone().sub(aggregatorClipped.current);
      let updatedPos = aggregatorClipped.current.clone().add(direction);

      // Если включён режим перетаскивания только по одной оси, оставляем остальные координаты без изменений
      if (axisMode === "X") {
        updatedPos.y = betPosition.y;
        updatedPos.z = betPosition.z;
      } else if (axisMode === "Y") {
        updatedPos.x = betPosition.x;
        updatedPos.z = betPosition.z;
      }

      // Ограничиваем длину белой линии
      const finalDir = updatedPos.clone().sub(aggregatorClipped.current);
      if (finalDir.length() > maxWhiteLength) {
        finalDir.setLength(maxWhiteLength);
        updatedPos = aggregatorClipped.current.clone().add(finalDir);
      }

      setBetPosition(updatedPos);
      debouncedUpdateWhiteLine(updatedPos);

      // Вычисляем ставку как долю от общего баланса
      const fraction = finalDir.length() / maxWhiteLength;
      setBetAmount(userBalance * fraction);
      handleDrag(updatedPos);
    },
    [
      isDragging,
      gl.domElement,
      camera,
      betPosition,
      axisMode,
      maxWhiteLength,
      debouncedUpdateWhiteLine,
      userBalance,
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
      onShowConfirmButton(true, {
        amount: betAmt,
        predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
      });
    }
  }, [
    isDragging,
    betPosition,
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
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gl.domElement, handlePointerDown, handlePointerMove, handlePointerUp]);

  return null;
};

export default BetLines;
