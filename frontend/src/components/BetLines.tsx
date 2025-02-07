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
import debounce from "lodash.debounce";
import { DebouncedFunc } from "lodash";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;  // Жёлтая (агрегатор)
  userPreviousBet: THREE.Vector3; // Белая (прошлая ставка)
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: {
      amount: number;
      predicted_vector: number[];
    }
  ) => void;
  maxYellowLength: number;
  maxWhiteLength: number;
  handleDrag: (newPosition: THREE.Vector3) => void;
  axisMode: "X" | "Y";
  setBetAmount: (newAmount: number) => void;
}

const LOCAL_KEY = "userBetVector";

/**
 * Вспомогательная функция, чтобы TypeScript не ругался на debounce(...) с Vector3
 */
function debounceVector3(
  fn: (pos: THREE.Vector3) => void,
  wait: number
): DebouncedFunc<(pos: THREE.Vector3) => void> {
  // @ts-expect-error meow
  return debounce((...args: [THREE.Vector3]) => fn(...args), wait);
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
  const { gl, camera, scene } = useThree();

  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // ---------- Состояния ----------
  const [isDragging, setIsDragging] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  // ---------- Ссылки на объекты ----------
  const yellowLineRef = useRef<Line2|null>(null);
  const whiteLineRef = useRef<Line2|null>(null);
  const sphereRef = useRef<THREE.Mesh|null>(null);
  const yellowConeRef = useRef<THREE.Mesh|null>(null);
  const whiteConeRef = useRef<THREE.Mesh|null>(null);

  // ---------- 1) Загружаем баланс ----------
  useEffect(() => {
    (async () => {
      try {
        const { balance } = await fetchUserBalances();
        setUserBalance(balance);
        console.log("[BetLines] userBalance =", balance);
      } catch (err) {
        console.error("[BetLines] Failed to fetch user balances:", err);
      }
    })();
  }, []);

  // ---------- 2) aggregatorClipped (жёлтая) ----------
  // Обрезаем previousBetEnd до maxYellowLength
  const aggregatorClipped = useMemo(() => {
    const depositVec = previousBetEnd.clone();
    if (depositVec.length() > maxYellowLength) {
      depositVec.setLength(maxYellowLength);
    }
    console.log("[BetLines] aggregatorClipped computed:", depositVec.toArray());
    return depositVec;
  }, [previousBetEnd, maxYellowLength]);

  // ---------- 3) Начальное положение белой стрелки (betPosition) ----------
  // Читаем из localStorage, если там есть; иначе userPreviousBet
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(() => {
    // Смотрим localStorage
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length >= 3) {
          const localVec = new THREE.Vector3(arr[0], arr[1], arr[2]);
          console.log("[BetLines] Loading betPosition from localStorage:", localVec.toArray());
          return localVec;
        }
      }
    } catch (err) {
      console.error("[BetLines] parse stored bet error:", err);
    }
    // Если нет localStorage — берём userPreviousBet
    console.log("[BetLines] betPosition from userPreviousBet:", userPreviousBet.toArray());
    return userPreviousBet.clone();
  });

  // При mount (или обновлении aggregatorClipped) — обрезаем betPosition
  useEffect(() => {
    const dir = betPosition.clone().sub(aggregatorClipped);
    if (dir.length() > maxWhiteLength) {
      dir.setLength(maxWhiteLength);
      const clippedPos = aggregatorClipped.clone().add(dir);
      setBetPosition(clippedPos);
      console.log("[BetLines] betPosition clipped at mount:", clippedPos.toArray());
    }
  }, []); // Запускаем один раз при mount

  // Если userPreviousBet меняется (из пропов) — тоже обновимся
  useEffect(() => {
    // Для отладки
    console.log("[BetLines] userPreviousBet changed =>", userPreviousBet.toArray());
    const offset = userPreviousBet.clone().sub(aggregatorClipped);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(offset);
    }
    setBetPosition(userPreviousBet.clone());
  }, [userPreviousBet, aggregatorClipped, maxWhiteLength]);

  // ---------- 4) Debounced обновление белой линии ----------
  // Помогаем TypeScript через функцию debounceVector3
  const debouncedUpdateWhiteLine = useMemo(() => {
    return debounceVector3((pos: THREE.Vector3) => {
      if (!whiteLineRef.current || !whiteLineRef.current.geometry) return;
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z,
        pos.x, pos.y, pos.z
      ]);
      geom.computeBoundingSphere?.();
      console.log("[BetLines] debouncedUpdateWhiteLine =>", pos.toArray());
    }, 15);
  }, [aggregatorClipped]);

  // ---------- 5) Создание линий, конусов, сферы (один раз) ----------
  useEffect(() => {
    console.log("[BetLines] Creating lines, cones, sphere (ONE TIME)");

    // --- Жёлтая линия ---
    const yGeom = new LineGeometry();
    yGeom.setPositions([
      0,0,0,
      aggregatorClipped.x,
      aggregatorClipped.y,
      aggregatorClipped.z
    ]);
    const yMat = new LineMaterial({
      color:"yellow",
      linewidth:3,
      resolution:new THREE.Vector2(window.innerWidth, window.innerHeight)
    });
    const yLine = new Line2(yGeom, yMat);
    yellowLineRef.current = yLine;
    scene.add(yLine);

    // Жёлтый конус
    const yCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1,0.3,12),
      new THREE.MeshStandardMaterial({ color:"yellow" })
    );
    yCone.position.copy(aggregatorClipped);
    {
      const dir = aggregatorClipped.clone().normalize();
      if (dir.length()>0) {
        const up = new THREE.Vector3(0,1,0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        yCone.setRotationFromQuaternion(quat);
      }
    }
    yellowConeRef.current = yCone;
    scene.add(yCone);

    // --- Белая линия ---
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z,
      betPosition.x, betPosition.y, betPosition.z
    ]);
    const wMat = new LineMaterial({
      color:"white",
      linewidth:3,
      resolution:new THREE.Vector2(window.innerWidth, window.innerHeight)
    });
    const wLine = new Line2(wGeom, wMat);
    whiteLineRef.current = wLine;
    scene.add(wLine);

    // Белый конус
    const wCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1,0.3,12),
      new THREE.MeshStandardMaterial({ color:"white" })
    );
    wCone.position.copy(betPosition);
    {
      const dirW = betPosition.clone().sub(aggregatorClipped).normalize();
      if (dirW.length()>0) {
        const up = new THREE.Vector3(0,1,0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        wCone.setRotationFromQuaternion(quatW);
      }
    }
    whiteConeRef.current = wCone;
    scene.add(wCone);

    // Сфера
    const sph = new THREE.Mesh(
      new THREE.SphereGeometry(0.5,16,16),
      new THREE.MeshStandardMaterial({
        color:"blue",
        opacity:0.5,
        transparent:true
      })
    );
    sph.position.copy(betPosition);
    sphereRef.current = sph;
    scene.add(sph);

    // Cleanup
    return () => {
      if (yLine) scene.remove(yLine);
      if (yCone) scene.remove(yCone);
      if (wLine) scene.remove(wLine);
      if (wCone) scene.remove(wCone);
      if (sph)   scene.remove(sph);
    };
  }, [scene, aggregatorClipped, betPosition]);

  // ---------- 6) useEffect: при изменении aggregatorClipped / betPosition, обновляем объекты ----------
  useEffect(() => {
    console.log("[BetLines useEffect] aggregator=", aggregatorClipped.toArray(),
      "betPosition=", betPosition.toArray());

    // Жёлтый line + конус
    if (yellowLineRef.current?.geometry) {
      const geom = yellowLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        0, 0, 0,
        aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z
      ]);
      geom.computeBoundingSphere?.();
    }
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(aggregatorClipped);
      const dir = aggregatorClipped.clone().normalize();
      if (dir.length()>0) {
        const up = new THREE.Vector3(0,1,0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }

    // Белая line + конус + сфера
    if (whiteLineRef.current?.geometry) {
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z,
        betPosition.x, betPosition.y, betPosition.z
      ]);
      geom.computeBoundingSphere?.();
    }
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      const dirW = betPosition.clone().sub(aggregatorClipped).normalize();
      if (dirW.length()>0) {
        const up = new THREE.Vector3(0,1,0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }
  }, [aggregatorClipped, betPosition]);

  // ---------- 7) Drag-логика ----------
  const isClickOnSphere = useCallback((evt: PointerEvent) => {
    if (!sphereRef.current) return false;
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((evt.clientX - rect.left)/rect.width)*2 -1,
      -((evt.clientY - rect.top)/rect.height)*2 +1
    );
    raycaster.current.setFromCamera(mouse, camera);
    const hits = raycaster.current.intersectObject(sphereRef.current);
    return hits.length>0;
  }, [camera, gl.domElement]);

  const updatePlane = useCallback(() => {
    const camDir = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(camDir, betPosition);
    console.log("[BetLines] updatePlane => betPosition=", betPosition.toArray());
  }, [camera, betPosition]);

  const handlePointerDown = useCallback((evt: PointerEvent) => {
    console.log("[BetLines] pointerDown");
    if (isClickOnSphere(evt)) {
      setIsDragging(true);
      onDragging(true);
      updatePlane();
      console.log("[BetLines] start dragging");
    }
  }, [isClickOnSphere, onDragging, updatePlane]);

  const handlePointerMove = useCallback((evt: PointerEvent) => {
    if (!isDragging) return;
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((evt.clientX - rect.left)/rect.width)*2 -1,
      -((evt.clientY - rect.top)/rect.height)*2 +1
    );
    raycaster.current.setFromCamera(mouse, camera);

    const intersectPt = new THREE.Vector3();
    if (!raycaster.current.ray.intersectPlane(plane.current, intersectPt)) {
      console.log("[BetLines] pointerMove => no intersection");
      return;
    }

    // direction = intersectPt - aggregatorClipped
    const direction = intersectPt.clone().sub(aggregatorClipped);

    // newPos = aggregatorClipped + direction( axisMode ) - then clamp
    let newPos = aggregatorClipped.clone();

    if (axisMode==="X") {
      newPos.x += direction.x;
    } else if (axisMode==="Y") {
      newPos.y += direction.y;
    } else {
      newPos.add(direction);
    }

    // Обрезаем по maxWhiteLength
    const finalDir = newPos.clone().sub(aggregatorClipped);
    if (finalDir.length() > maxWhiteLength) {
      finalDir.setLength(maxWhiteLength);
      newPos = aggregatorClipped.clone().add(finalDir);
    }

    console.log("[BetLines] pointerMove => aggregator=", aggregatorClipped.toArray(),
      "direction=", direction.toArray(),
      "newPos=", newPos.toArray()
    );

    setBetPosition(newPos);
    debouncedUpdateWhiteLine(newPos);

    // fraction
    const fraction = finalDir.length()/maxWhiteLength;
    setBetAmount(userBalance * fraction);

    handleDrag(newPos);
  }, [
    isDragging, aggregatorClipped, axisMode, camera, gl.domElement,
    maxWhiteLength, userBalance, setBetAmount,
    debouncedUpdateWhiteLine, handleDrag
  ]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    onDragging(false);

    const finalDir = betPosition.clone().sub(aggregatorClipped);
    const fraction = Math.min(finalDir.length()/maxWhiteLength, 1);
    const betAmt = fraction * userBalance;
    setBetAmount(betAmt);

    // Сохраняем в localStorage (финальное положение)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(betPosition.toArray()));
    console.log("[BetLines] pointerUp => final betPos=", betPosition.toArray(), " => saved in localStorage");

    onShowConfirmButton(true, {
      amount: betAmt,
      predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
    });
  }, [
    isDragging, onDragging, aggregatorClipped,
    betPosition, maxWhiteLength, userBalance,
    setBetAmount, onShowConfirmButton
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

  return (
    <>
      {/* Желтый конус */}
      <mesh ref={yellowConeRef}>
        <coneGeometry args={[0.1,0.3,12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      {/* Белый конус */}
      <mesh ref={whiteConeRef}>
        <coneGeometry args={[0.1,0.3,12]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Сфера (для drag) */}
      <mesh ref={sphereRef} scale={[0.5,0.5,0.5]}>
        <sphereGeometry args={[1,16,16]} />
        <meshStandardMaterial color="blue" opacity={0.5} transparent />
      </mesh>
    </>
  );
};

export default BetLines;
