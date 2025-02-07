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
  previousBetEnd: THREE.Vector3;   // Жёлтая стрелка (агрегатор)
  userPreviousBet: THREE.Vector3;  // Белая стрелка (прошлая ставка), если (0,0,0) – пара не выбрана
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
  // ===== THREE & references =====
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  const yellowLineRef = useRef<Line2 | null>(null);
  const yellowConeRef = useRef<THREE.Mesh | null>(null);

  // Белые объекты (создаём только если userPreviousBet != (0,0,0))
  const whiteLineRef = useRef<Line2 | null>(null);
  const whiteConeRef = useRef<THREE.Mesh | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);

  // ===== Drag state =====
  const [isDragging, setIsDragging] = useState(false);

  // ===== Balance =====
  const [userBalance, setUserBalance] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const { balance } = await fetchUserBalances();
        setUserBalance(balance);
      } catch (error) {
        console.error("[BetLines] Failed to fetch user balances:", error);
      }
    })();
  }, []);

  // ===== aggregatorClipped (жёлтая стрелка) =====
  const aggregatorClipped = useMemo(() => {
    const depositVec = previousBetEnd.clone();
    if (depositVec.length() > maxYellowLength) {
      depositVec.setLength(maxYellowLength);
    }
    return depositVec;
  }, [previousBetEnd, maxYellowLength]);

  // ===== betPosition (белая стрелка) =====
  // При монтировании: если в localStorage есть сохранённый вектор – используем его (без обрезания),
  // иначе – используем userPreviousBet (и обрезаем его по maxWhiteLength).
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      console.log("[BetLines] localStorage content for userBetVector =>", stored);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length >= 3) {
          console.log("[BetLines] Using white vector from localStorage:", arr);
          return new THREE.Vector3(arr[0], arr[1], arr[2]);
        }
      }
    } catch (err) {
      console.error("[BetLines] parse localStorage error:", err);
    }
    console.log("[BetLines] Using userPreviousBet:", userPreviousBet.toArray());
    // Если localStorage пуст, обрезаем userPreviousBet
    const dir = userPreviousBet.clone().sub(aggregatorClipped);
    if (dir.length() > maxWhiteLength) {
      dir.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(dir);
    }
    return userPreviousBet.clone();
  });

  // Если userPreviousBet меняется (то есть пара выбрана), обновляем betPosition,
  // но только если localStorage ещё пуст (то есть ставка не подтверждена)
  useEffect(() => {
    if (
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 0
    ) {
      // Пара не выбрана – ничего не делаем
      return;
    }
    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored) {
      console.log("[BetLines] localStorage present, keeping white vector");
      return;
    }
    const offset = userPreviousBet.clone().sub(aggregatorClipped);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(offset);
    }
    setBetPosition(userPreviousBet.clone());
  }, [userPreviousBet, aggregatorClipped, maxWhiteLength]);

  // ===== Создание жёлтой стрелки (один раз) =====
  useEffect(() => {
    // Жёлтая линия
    const yGeom = new LineGeometry();
    yGeom.setPositions([
      0, 0, 0,
      aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z
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
    {
      const dir = aggregatorClipped.clone().normalize();
      if (dir.length() > 0) {
        const up = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        yCone.setRotationFromQuaternion(quat);
      }
    }
    yellowConeRef.current = yCone;
    scene.add(yCone);

    return () => {
      if (yellowLineRef.current) scene.remove(yellowLineRef.current);
      if (yellowConeRef.current) scene.remove(yellowConeRef.current);
    };
  }, [aggregatorClipped, scene]);

  // ===== Создание белой стрелки (один раз) =====
  // Белые объекты создаются только если userPreviousBet != (0,0,0)
  useEffect(() => {
    if (
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 0
    ) {
      // Пара не выбрана — удаляем белые объекты (если они уже созданы)
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
      if (whiteConeRef.current) scene.remove(whiteConeRef.current);
      if (sphereRef.current) scene.remove(sphereRef.current);
      whiteLineRef.current = null;
      whiteConeRef.current = null;
      sphereRef.current = null;
      return;
    }

    // Создаём белую стрелку
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z,
      betPosition.x, betPosition.y, betPosition.z
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
    {
      const dirW = betPosition.clone().sub(aggregatorClipped).normalize();
      if (dirW.length() > 0) {
        const up = new THREE.Vector3(0, 1, 0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        wCone.setRotationFromQuaternion(quatW);
      }
    }
    whiteConeRef.current = wCone;
    scene.add(wCone);

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

  }, [userPreviousBet, aggregatorClipped, betPosition, scene]);

  // ===== Обновление объектов при изменении aggregatorClipped или betPosition =====
  useEffect(() => {
    // Жёлтая линия и конус
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
      if (dir.length() > 0) {
        const up = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    // Белая линия, конус и сфера
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
      if (dirW.length() > 0) {
        const up = new THREE.Vector3(0, 1, 0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }
  }, [aggregatorClipped, betPosition]);

  // ===== Drag-логика =====
  // Возвращаем исходную логику движения белой стрелки, как было раньше
  const handlePointerDown = useCallback((evt: PointerEvent) => {
    if (sphereRef.current) {
      // const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        (evt.clientX / gl.domElement.clientWidth) * 2 - 1,
        -(evt.clientY / gl.domElement.clientHeight) * 2 + 1
      );
      raycaster.current.setFromCamera(mouse, camera);
      const hits = raycaster.current.intersectObject(sphereRef.current);
      if (hits.length > 0) {
        setIsDragging(true);
        onDragging(true);
        const camDir = camera.getWorldDirection(new THREE.Vector3());
        plane.current.setFromNormalAndCoplanarPoint(camDir, betPosition);
      }
    }
  }, [camera, gl.domElement, onDragging, betPosition]);

  const handlePointerMove = useCallback((evt: PointerEvent) => {
    if (!isDragging) return;

    const mouse = new THREE.Vector2(
      (evt.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(evt.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);

    const intersectPt = new THREE.Vector3();
    if (!raycaster.current.ray.intersectPlane(plane.current, intersectPt)) {
      return;
    }

    console.log("[BetLines] pointerMove => intersectPt =", intersectPt.toArray());

    // Рассчитываем направление от начала белой стрелки (aggregatorClipped)
    const direction = intersectPt.clone().sub(aggregatorClipped);
    console.log("[BetLines] direction =", direction.toArray());

    // Берём текущее betPosition и вычисляем новый вектор
    const updatedPos = betPosition.clone();
    const partialPos = aggregatorClipped.clone().add(direction);

    if (axisMode === "X") {
      updatedPos.x = partialPos.x;
    } else if (axisMode === "Y") {
      updatedPos.y = partialPos.y;
    }

    const finalDir = updatedPos.clone().sub(aggregatorClipped);
    console.log("[BetLines] Before finalDir limit:", finalDir.toArray(), "length =", finalDir.length());

    if (finalDir.length() > maxWhiteLength) {
      finalDir.setLength(maxWhiteLength);
      console.log("[BetLines] After finalDir limit:", finalDir.toArray(), "length =", finalDir.length());
      updatedPos.copy(aggregatorClipped).add(finalDir);
      console.log("[BetLines] UpdatedPos after applying limited finalDir:", updatedPos.toArray());
      const fraction = finalDir.length() / maxWhiteLength;
      setBetAmount(userBalance * fraction);
      const normalizedFinalDir = finalDir.clone().normalize().multiplyScalar(maxWhiteLength);
      console.log("[BetLines] normalizedFinalDir:", normalizedFinalDir.toArray());
      updatedPos.copy(aggregatorClipped).add(normalizedFinalDir);
      console.log("[BetLines] UpdatedPos after applying limited:", updatedPos.toArray());
      if (updatedPos.clone().sub(aggregatorClipped).length() > maxWhiteLength) {
        console.error("[BetLines] Error: updatedPos exceeds maxWhiteLength");
      }
    }

    setBetPosition(updatedPos);
    console.log("[BetLines] pointerMove => new betPosition:", updatedPos.toArray());
    if (whiteLineRef.current) {
      // Обновляем геометрию белой линии (через debounce, если нужно)
      // Здесь можно вызвать debouncedUpdateWhiteLine(updatedPos);
      // Но для отладки вызовем напрямую:
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z,
        updatedPos.x, updatedPos.y, updatedPos.z
      ]);
      geom.computeBoundingSphere?.();
    }
    if (sphereRef.current) {
      sphereRef.current.position.copy(updatedPos);
    }
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(updatedPos);
      const dirW = updatedPos.clone().sub(aggregatorClipped).normalize();
      if (dirW.length() > 0) {
        const up = new THREE.Vector3(0, 1, 0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }
    handleDrag(updatedPos);
  }, [axisMode, betPosition, handleDrag, isDragging, maxWhiteLength, onDragging, raycaster, userBalance, gl.domElement, camera, aggregatorClipped, setBetAmount]);

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
  }, [aggregatorClipped, betPosition, isDragging, maxWhiteLength, onDragging, onShowConfirmButton, setBetAmount, userBalance]);

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
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="blue" opacity={0.5} transparent />
      </mesh>
    </>
  );
};

export default BetLines;
