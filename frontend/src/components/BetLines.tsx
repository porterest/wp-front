import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { fetchUserBalances } from "../services/api";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;   // Жёлтая стрелка (агрегатор) – данные с бэка
  userPreviousBet: THREE.Vector3;    // Белая стрелка (прошлая ставка с бэка); если (0,0,0) – пара не выбрана
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
  // Получаем ссылки на Three.js объекты из фреймворка
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // Ссылки на объекты графики
  const yellowLineRef = useRef<Line2 | null>(null);
  const yellowConeRef = useRef<THREE.Mesh | null>(null);
  const whiteLineRef = useRef<Line2 | null>(null);
  const whiteConeRef = useRef<THREE.Mesh | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);

  // Состояние перетаскивания
  const [isDragging, setIsDragging] = useState(false);

  // Баланс пользователя (например, для расчёта ставки)
  const [userBalance, setUserBalance] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const { balance } = await fetchUserBalances();
        setUserBalance(balance);
        console.log("[BetLines] userBalance:", balance);
      } catch (err) {
        console.error("[BetLines] Failed to fetch user balances:", err);
      }
    })();
  }, []);

  // Вычисляем агрегатор, ограничивая его длину до maxYellowLength и принудительно задавая z = 1
  const aggregatorClipped = useMemo(() => {
    const agg = previousBetEnd.clone();
    if (agg.length() > maxYellowLength) {
      agg.setLength(maxYellowLength);
    }
    agg.z = 1;
    return agg;
  }, [previousBetEnd, maxYellowLength]);

  // Инициализация betPosition: если userPreviousBet равен (0,0,0), добавляем минимальное смещение
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(() => {
    if (
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 0
    ) {
      const offset = new THREE.Vector3(
        axisMode === "X" ? 0.001 : 0,
        axisMode === "Y" ? 0.001 : 0,
        0
      );
      return aggregatorClipped.clone().add(offset);
    }
    return userPreviousBet.clone();
  });

  // При изменении userPreviousBet обновляем betPosition
  useEffect(() => {
    if (
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 0
    ) {
      const offset = new THREE.Vector3(
        axisMode === "X" ? 0.001 : 0,
        axisMode === "Y" ? 0.001 : 0,
        0
      );
      setBetPosition(aggregatorClipped.clone().add(offset));
    } else {
      const offset = userPreviousBet.clone().sub(aggregatorClipped);
      if (offset.length() > maxWhiteLength) {
        offset.setLength(maxWhiteLength);
      }
      const newPos = aggregatorClipped.clone().add(offset);
      newPos.z = 1;
      setBetPosition(newPos);
    }
  }, [userPreviousBet, aggregatorClipped, maxWhiteLength, axisMode]);

  // Создание жёлтых объектов (линия и конус)
  useEffect(() => {
    // Жёлтая линия
    const yGeom = new LineGeometry();
    yGeom.setPositions([
      0, 0, 0,
      aggregatorClipped.x,
      aggregatorClipped.y,
      aggregatorClipped.z
    ]);
    const yMat = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
    });
    const yLine = new Line2(yGeom, yMat);
    yellowLineRef.current = yLine;
    scene.add(yLine);

    // Жёлтый конус
    const yCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "yellow" })
    );
    yCone.position.copy(aggregatorClipped);
    yCone.position.z = 1;
    const dir = aggregatorClipped.clone().normalize();
    if (dir.length() > 0) {
      const up = new THREE.Vector3(0, 0, 1);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      yCone.setRotationFromQuaternion(quat);
    }
    yellowConeRef.current = yCone;
    scene.add(yCone);

    return () => {
      if (yellowLineRef.current) scene.remove(yellowLineRef.current);
      if (yellowConeRef.current) scene.remove(yellowConeRef.current);
    };
  }, [aggregatorClipped, scene]);

  // Создание белых объектов (линия, конус и сфера)
  useEffect(() => {
    // Удаляем старые объекты (если есть)
    if (whiteLineRef.current) scene.remove(whiteLineRef.current);
    if (whiteConeRef.current) scene.remove(whiteConeRef.current);
    if (sphereRef.current) scene.remove(sphereRef.current);

    // Белая линия
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      aggregatorClipped.x,
      aggregatorClipped.y,
      aggregatorClipped.z,
      betPosition.x,
      betPosition.y,
      betPosition.z
    ]);
    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
    });
    const wLine = new Line2(wGeom, wMat);
    whiteLineRef.current = wLine;
    scene.add(wLine);

    // Белый конус
    const wCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "white" })
    );
    wCone.position.copy(betPosition);
    // Направляем конус от aggregatorClipped к betPosition
    const direction = betPosition.clone().sub(aggregatorClipped).normalize();
    if (direction.length() > 0) {
      const up = new THREE.Vector3(0, 0, 1);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, direction);
      wCone.setRotationFromQuaternion(quat);
    }
    whiteConeRef.current = wCone;
    scene.add(wCone);

    // Сфера в точке betPosition
    const sph = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshStandardMaterial({
        color: "blue",
        opacity: 0.5,
        transparent: true
      })
    );
    sph.position.copy(betPosition);
    sphereRef.current = sph;
    scene.add(sph);

    return () => {
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
      if (whiteConeRef.current) scene.remove(whiteConeRef.current);
      if (sphereRef.current) scene.remove(sphereRef.current);
    };
  }, [aggregatorClipped, betPosition, scene]);

  // Обновление геометрии объектов при изменении aggregatorClipped или betPosition
  useEffect(() => {
    if (yellowLineRef.current?.geometry) {
      const geom = yellowLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        0, 0, 0,
        aggregatorClipped.x,
        aggregatorClipped.y,
        aggregatorClipped.z
      ]);
      geom.computeBoundingSphere?.();
    }
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(aggregatorClipped);
      const dir = aggregatorClipped.clone().normalize();
      if (dir.length() > 0) {
        const up = new THREE.Vector3(0, 0, 1);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    if (whiteLineRef.current?.geometry) {
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        aggregatorClipped.x,
        aggregatorClipped.y,
        aggregatorClipped.z,
        betPosition.x,
        betPosition.y,
        betPosition.z
      ]);
      geom.computeBoundingSphere?.();
    }
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      const direction = betPosition.clone().sub(aggregatorClipped).normalize();
      if (direction.length() > 0) {
        const up = new THREE.Vector3(0, 0, 1);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, direction);
        whiteConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }
  }, [aggregatorClipped, betPosition]);

  // ========= DRAG-ЛОГИКА =========

  // Проверяем, что клик пришёл по сфере (область для перетаскивания)
  const isClickOnSphere = useCallback((evt: PointerEvent) => {
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((evt.clientX - rect.left) / rect.width) * 2 - 1,
      -((evt.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);
    const hits = raycaster.current.intersectObject(sphereRef.current!);
    return hits.length > 0;
  }, [camera, gl.domElement]);

  // Обработчик pointerdown – останавливаем всплытие и начинаем drag, если клик по сфере
  const handlePointerDown = useCallback((evt: PointerEvent) => {
    evt.preventDefault();
    evt.stopPropagation();
    if (isClickOnSphere(evt)) {
      setIsDragging(true);
      onDragging(true);
    }
  }, [isClickOnSphere, onDragging]);

  // Обработчик pointermove – динамически вычисляем плоскость, пересекаем луч и обновляем позицию
  const handlePointerMove = useCallback((evt: PointerEvent) => {
    if (!isDragging) return;
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((evt.clientX - rect.left) / rect.width) * 2 - 1,
      -((evt.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);

    // Обновляем плоскость: нормаль – противоположна направлению взгляда камеры, плоскость проходит через aggregatorClipped
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.negate();
    plane.current.setFromNormalAndCoplanarPoint(camDir, aggregatorClipped);

    const intersect = new THREE.Vector3();
    if (!raycaster.current.ray.intersectPlane(plane.current, intersect)) {
      return;
    }

    // Вычисляем новое положение как aggregatorClipped плюс смещение от пересечения
    const direction = intersect.clone().sub(aggregatorClipped);
    let newPos = aggregatorClipped.clone();
    if (axisMode === "X") {
      newPos.x += direction.x;
    } else if (axisMode === "Y") {
      newPos.y += direction.y;
    } else {
      newPos.add(direction);
    }
    // Ограничиваем смещение по длине
    const finalDir = newPos.clone().sub(aggregatorClipped);
    if (finalDir.length() > maxWhiteLength) {
      finalDir.setLength(maxWhiteLength);
      newPos = aggregatorClipped.clone().add(finalDir);
    }
    newPos.z = 1; // гарантируем, что z = 1

    setBetPosition(newPos);
    const fraction = finalDir.length() / maxWhiteLength;
    setBetAmount(userBalance * fraction);
    handleDrag(newPos);
  }, [
    isDragging,
    gl.domElement,
    camera,
    aggregatorClipped,
    axisMode,
    maxWhiteLength,
    userBalance,
    handleDrag,
    setBetAmount
  ]);

  // По pointerup завершаем drag и показываем кнопку подтверждения
  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    onDragging(false);
    const finalDir = betPosition.clone().sub(aggregatorClipped);
    const fraction = Math.min(finalDir.length() / maxWhiteLength, 1);
    const betAmt = fraction * userBalance;
    setBetAmount(betAmt);
    onShowConfirmButton(true, {
      amount: betAmt,
      predicted_vector: [betPosition.x, betPosition.y, betPosition.z]
    });
  }, [
    isDragging,
    betPosition,
    aggregatorClipped,
    maxWhiteLength,
    userBalance,
    onDragging,
    onShowConfirmButton,
    setBetAmount
  ]);

  // Подписываемся на события pointer на канве
  useEffect(() => {
    const c = gl.domElement;
    c.addEventListener("pointerdown", handlePointerDown);
    c.addEventListener("pointermove", handlePointerMove);
    c.addEventListener("pointerup", handlePointerUp);
    return () => {
      c.removeEventListener("pointerdown", handlePointerDown);
      c.removeEventListener("pointermove", handlePointerMove);
      c.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gl.domElement, handlePointerDown, handlePointerMove, handlePointerUp]);

  return (
    <>
      {/* Рендерим жёлтый и белый конусы */}
      <mesh ref={yellowConeRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>
      <mesh ref={whiteConeRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </>
  );
};

export default BetLines;
