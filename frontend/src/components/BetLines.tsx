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

const LOCAL_KEY = "userBetVector";

// Функция для проверки, равен ли вектор (почти) нулю (с учетом эпсилон)
const isVectorZero = (vec: THREE.Vector3, eps = 0.000001): boolean =>
  Math.abs(vec.x) < eps && Math.abs(vec.y) < eps && Math.abs(vec.z) < eps;

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
  // ===== THREE & ссылки =====
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  const yellowLineRef = useRef<Line2 | null>(null);
  const yellowConeRef = useRef<THREE.Mesh | null>(null);
  const whiteLineRef = useRef<Line2 | null>(null);
  const whiteConeRef = useRef<THREE.Mesh | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);

  // ===== Состояние перетаскивания =====
  const [isDragging, setIsDragging] = useState(false);

  // ===== Баланс пользователя =====
  const [userBalance, setUserBalance] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const { balance } = await fetchUserBalances();
        setUserBalance(balance);
      } catch (err) {
        console.error("[BetLines] Failed to fetch user balances:", err);
      }
    })();
  }, []);

  // ===== aggregatorClipped (Жёлтая стрелка) =====
  // Берём previousBetEnd и обрезаем его до maxYellowLength.
  const aggregatorClipped = useMemo(() => {
    const agg = previousBetEnd.clone();
    if (agg.length() > maxYellowLength) {
      agg.setLength(maxYellowLength);
    }
    console.log("[BetLines] aggregatorClipped =", agg.toArray());
    return agg;
  }, [previousBetEnd, maxYellowLength]);

  // ===== Флаг: userPreviousBet равен (0,0,0)?
  const isUserBetZero = useMemo(
    () =>
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 0,
    [userPreviousBet]
  );

  // ===== Инициализация белого вектора (betPosition) =====
  const [betPosition, setBetPosition] = useState<THREE.Vector3 | null>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      console.log("[BetLines] Проверяем localStorage, содержимое:", stored);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length >= 3) {
          console.log("[BetLines] Ситуация: белый вектор найден из LS:", arr);
          return new THREE.Vector3(arr[0], arr[1], arr[2]);
        }
      }
    } catch (err) {
      console.error("[BetLines] Ошибка парсинга LS:", err);
    }
    // Если LS пуст, то:
    if (isUserBetZero && isVectorZero(aggregatorClipped)) {
      console.log("[BetLines] Ситуация: нет ни агрегатора, ни ставки. Устанавливаем default (3,3,0)");
      return new THREE.Vector3(3, 3, 0);
    }
    if (isUserBetZero && !isVectorZero(aggregatorClipped)) {
      console.log("[BetLines] Ситуация: нет userPreviousBet, но есть агрегатор. Добавляем минимальное смещение.");
      const minDelta = 0.01; // минимальное смещение (настраиваемое)
      if (axisMode === "X") {
        return aggregatorClipped.clone().add(new THREE.Vector3(minDelta, 0, 0));
      } else if (axisMode === "Y") {
        return aggregatorClipped.clone().add(new THREE.Vector3(0, minDelta, 0));
      }
      return aggregatorClipped.clone();
    }
    console.log("[BetLines] Ситуация: есть и агрегатор, и userPreviousBet.");
    const dir = userPreviousBet.clone().sub(aggregatorClipped);
    if (dir.length() > maxWhiteLength) {
      dir.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(dir);
    }
    return userPreviousBet.clone();
  });

  // При изменении userPreviousBet (например, после выбора пары) – обновляем betPosition,
  // но если LS уже содержит значение, то оставляем его.
  useEffect(() => {
    console.log("[BetLines] userPreviousBet изменился:", userPreviousBet.toArray());
    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored) {
      console.log("[BetLines] LS присутствует – не обновляем betPosition из userPreviousBet");
      return;
    }
    if (
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 0
    ) {
      console.log("[BetLines] userPreviousBet равен (0,0,0) – устанавливаем default (3,3,0) для betPosition");
      setBetPosition(new THREE.Vector3(3, 3, 0));
      return;
    }
    const offset = userPreviousBet.clone().sub(aggregatorClipped);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(offset);
    }
    console.log("[BetLines] Обновлён betPosition из userPreviousBet:", userPreviousBet.toArray());
    setBetPosition(userPreviousBet.clone());
  }, [userPreviousBet, aggregatorClipped, maxWhiteLength]);

  // ===== Создание жёлтых объектов (один раз) =====
  useEffect(() => {
    // --- Жёлтая линия
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

    // --- Жёлтый конус
    const yCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "yellow" })
    );
    yCone.position.copy(aggregatorClipped);
    const dir = aggregatorClipped.clone().normalize();
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
  }, [aggregatorClipped, scene]);

  // ===== Создание белых объектов (один раз) =====
  useEffect(() => {
    // Белые объекты создаются всегда, чтобы пользователь мог перемещать белый вектор.
    if (!betPosition) {
      console.log("[BetLines] НЕТ betPosition – белые объекты не создаём");
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
      if (whiteConeRef.current) scene.remove(whiteConeRef.current);
      if (sphereRef.current) scene.remove(sphereRef.current);
      whiteLineRef.current = null;
      whiteConeRef.current = null;
      sphereRef.current = null;
      return;
    } else {
      console.log("[BetLines] ЕСТЬ и агрегатор, и betPosition – создаём белые объекты. betPosition =", betPosition.toArray());
    }

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

    const wCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "white" })
    );
    wCone.position.copy(betPosition);
    // Если userPreviousBet равен (0,0,0), то белый конус ориентируем как жёлтый
    if (isUserBetZero) {
      const dirAgg = aggregatorClipped.clone().normalize();
      if (dirAgg.length() > 0) {
        const up = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dirAgg);
        wCone.setRotationFromQuaternion(quat);
      }
    } else {
      const dirW = betPosition.clone().sub(aggregatorClipped).normalize();
      if (dirW.length() > 0) {
        const up = new THREE.Vector3(0, 1, 0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        wCone.setRotationFromQuaternion(quatW);
      }
    }
    whiteConeRef.current = wCone;
    scene.add(wCone);

    // Создаём drag‑point (синюю сферу) только если betPosition не равен (0,0,0)
    if (!isVectorZero(betPosition)) {
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
    } else {
      if (sphereRef.current) {
        scene.remove(sphereRef.current);
        sphereRef.current = null;
      }
    }

    return () => {
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
      if (whiteConeRef.current) scene.remove(whiteConeRef.current);
      if (sphereRef.current) scene.remove(sphereRef.current);
    };
  }, [aggregatorClipped, betPosition, scene, isUserBetZero]);

  // ===== Обновление объектов при изменении aggregatorClipped или betPosition =====
  useEffect(() => {
    // Обновляем жёлтую линию и конус
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
        const up = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    // Обновляем белую линию, конус и сферу (если betPosition существует)
    if (whiteLineRef.current?.geometry && betPosition) {
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
    if (whiteConeRef.current && betPosition) {
      whiteConeRef.current.position.copy(betPosition);
      if (isUserBetZero) {
        // Если нет пользовательской ставки, ориентируем белый конус как жёлтый
        const dirAgg = aggregatorClipped.clone().normalize();
        if (dirAgg.length() > 0) {
          const up = new THREE.Vector3(0, 1, 0);
          const quat = new THREE.Quaternion().setFromUnitVectors(up, dirAgg);
          whiteConeRef.current.setRotationFromQuaternion(quat);
        }
      } else {
        const dirW = betPosition.clone().sub(aggregatorClipped).normalize();
        if (dirW.length() > 0) {
          const up = new THREE.Vector3(0, 1, 0);
          const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
          whiteConeRef.current.setRotationFromQuaternion(quatW);
        }
      }
    }
    if (sphereRef.current && betPosition) {
      sphereRef.current.position.copy(betPosition);
    }
  }, [aggregatorClipped, betPosition, isUserBetZero]);

  // ===== Drag-логика =====
  const isClickOnSphere = useCallback((evt: PointerEvent) => {
    if (!sphereRef.current) return false;
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((evt.clientX - rect.left) / rect.width) * 2 - 1,
      -((evt.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);
    const hits = raycaster.current.intersectObject(sphereRef.current);
    return hits.length > 0;
  }, [camera, gl.domElement]);

  const updatePlane = useCallback(() => {
    const camDir = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(camDir, betPosition!);
  }, [camera, betPosition]);

  const handlePointerDown = useCallback((evt: PointerEvent) => {
    if (isClickOnSphere(evt)) {
      setIsDragging(true);
      onDragging(true);
      updatePlane();
    }
  }, [isClickOnSphere, onDragging, updatePlane]);

  const handlePointerMove = useCallback((evt: PointerEvent) => {
    if (!isDragging) return;
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((evt.clientX - rect.left) / rect.width) * 2 - 1,
      -((evt.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);

    const intersect = new THREE.Vector3();
    if (!raycaster.current.ray.intersectPlane(plane.current, intersect)) {
      return;
    }

    // direction = intersect - aggregatorClipped
    const direction = intersect.clone().sub(aggregatorClipped);
    let newPos = betPosition ? betPosition.clone() : new THREE.Vector3();

    if (axisMode === "X") {
      newPos.x = aggregatorClipped.x + direction.x;
    } else if (axisMode === "Y") {
      newPos.y = aggregatorClipped.y + direction.y;
    } else {
      newPos = aggregatorClipped.clone().add(direction);
    }

    // Clamp: если длина вектора превышает maxWhiteLength
    const finalDir = newPos.clone().sub(aggregatorClipped);
    if (finalDir.length() > maxWhiteLength) {
      finalDir.setLength(maxWhiteLength);
      newPos = aggregatorClipped.clone().add(finalDir);
    }

    setBetPosition(newPos);
    const fraction = finalDir.length() / maxWhiteLength;
    setBetAmount(userBalance * fraction);
    handleDrag(newPos);
  }, [
    isDragging,
    aggregatorClipped,
    betPosition,
    axisMode,
    camera,
    gl.domElement,
    maxWhiteLength,
    userBalance,
    handleDrag,
    setBetAmount
  ]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    onDragging(false);

    const finalDir = betPosition ? betPosition.clone().sub(aggregatorClipped) : new THREE.Vector3();
    const fraction = Math.min(finalDir.length() / maxWhiteLength, 1);
    const betAmt = fraction * userBalance;
    setBetAmount(betAmt);

    onShowConfirmButton(true, {
      amount: betAmt,
      predicted_vector: betPosition ? [betPosition.x, betPosition.y, betPosition.z] : [0, 0, 0]
    });
  }, [
    isDragging,
    aggregatorClipped,
    betPosition,
    maxWhiteLength,
    userBalance,
    onDragging,
    onShowConfirmButton,
    setBetAmount
  ]);

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
    </>
  );
};

export default BetLines;
