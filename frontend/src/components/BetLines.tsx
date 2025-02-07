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
  // THREE
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // Ссылки на объекты
  const yellowLineRef = useRef<Line2|null>(null);
  const whiteLineRef = useRef<Line2|null>(null);
  const yellowConeRef = useRef<THREE.Mesh|null>(null);
  const whiteConeRef = useRef<THREE.Mesh|null>(null);
  const sphereRef = useRef<THREE.Mesh|null>(null);

  // Состояние «drag»
  const [isDragging, setIsDragging] = useState(false);

  // Баланс юзера
  const [userBalance, setUserBalance] = useState(0);
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

  // 1) aggregatorClipped: обрезаем previousBetEnd (жёлтая) по maxYellowLength
  const aggregatorClipped = useMemo(() => {
    const v = previousBetEnd.clone();
    if (v.length()>maxYellowLength) {
      v.setLength(maxYellowLength);
    }
    return v;
  }, [previousBetEnd, maxYellowLength]);

  // 2) Начальное положение белого вектора
  //   Если localStorage есть — берём его (не обрезаем);
  //   Иначе — userPreviousBet (тоже не обрезаем).
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(() => {
    // Для отладки
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      console.log("[BetLines] localStorage userBetVector =", stored);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length>=3) {
          const fromLS = new THREE.Vector3(arr[0], arr[1], arr[2]);
          console.log("[BetLines] using localStorage vector:", fromLS.toArray());
          return fromLS;
        }
      }
    } catch (err) {
      console.error("[BetLines] parse localStorage error:", err);
    }
    console.log("[BetLines] using userPreviousBet:", userPreviousBet.toArray());
    return userPreviousBet.clone();
  });

  // Если userPreviousBet меняется извне, обновим betPosition (не обрезаем)
  useEffect(() => {
    console.log("[BetLines] userPreviousBet changed =>", userPreviousBet.toArray());
    setBetPosition(userPreviousBet.clone());
  }, [userPreviousBet]);

  // 3) Создаём линии, конусы, сферу — один раз
  useEffect(() => {
    console.log("[BetLines] creating lines, cones, sphere (once)");

    // Жёлтая линия
    const yGeom = new LineGeometry();
    yGeom.setPositions([
      0,0,0,
      aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z
    ]);
    const yMat = new LineMaterial({
      color:"yellow",
      linewidth:3,
      resolution:new THREE.Vector2(window.innerWidth,window.innerHeight),
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

    // Белая линия
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z,
      betPosition.x,       betPosition.y,       betPosition.z
    ]);
    const wMat = new LineMaterial({
      color:"white",
      linewidth:3,
      resolution:new THREE.Vector2(window.innerWidth,window.innerHeight),
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
        transparent:true,
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
  }, []);

  // 4) Обновление объектов при смене aggregatorClipped или betPosition
  useEffect(() => {
    // Жёлтая линия + конус
    if (yellowLineRef.current?.geometry) {
      const geom = yellowLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        0,0,0,
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

    // Белая линия + конус + сфера
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

  }, [aggregatorClipped, betPosition, scene]);

  // 5) Логика Drag
  const updatePlane = useCallback(() => {
    const camDir = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(camDir, betPosition);
  }, [camera, betPosition]);

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

  const handlePointerDown = useCallback((evt: PointerEvent) => {
    if (isClickOnSphere(evt)) {
      setIsDragging(true);
      onDragging(true);
      updatePlane();
      console.log("[BetLines] pointerDown => dragging start");
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
    let newPos = betPosition.clone();

    // Если axisMode="X", меняем только X;
    // Если "Y", меняем только Y
    // ИНАЧЕ — или если axisMode не задан — free movement
    if (axisMode === "X") {
      newPos.x = aggregatorClipped.x + direction.x;
    } else if (axisMode === "Y") {
      newPos.y = aggregatorClipped.y + direction.y;
    } else {
      newPos = aggregatorClipped.clone().add(direction);
    }

    // Обрезаем по maxWhiteLength
    const finalDir = newPos.clone().sub(aggregatorClipped);
    if (finalDir.length()>maxWhiteLength) {
      finalDir.setLength(maxWhiteLength);
      newPos = aggregatorClipped.clone().add(finalDir);
    }

    setBetPosition(newPos);

    const fraction = finalDir.length()/maxWhiteLength;
    setBetAmount(userBalance*fraction);

    handleDrag(newPos);

  }, [
    isDragging, aggregatorClipped, axisMode,
    betPosition, camera, gl.domElement,
    maxWhiteLength, userBalance,
    setBetAmount, handleDrag
  ]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    onDragging(false);

    // При отпускании: считаем финальную ставку
    const finalDir = betPosition.clone().sub(aggregatorClipped);
    const fraction = Math.min(finalDir.length()/maxWhiteLength,1);
    const betAmt = fraction * userBalance;
    setBetAmount(betAmt);

    // Вызываем диалог confirm
    onShowConfirmButton(true, {
      amount: betAmt,
      predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
    });

    console.log("[BetLines] pointerUp => final bet:", betPosition.toArray(), " => betAmt =", betAmt);

  }, [
    isDragging, aggregatorClipped,
    betPosition, maxWhiteLength,
    userBalance, setBetAmount,
    onDragging, onShowConfirmButton
  ]);

  // Слушатели
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

  // Логируем всё localStorage при монтировании (чтобы проверить, что там лежит):
  useEffect(() => {
    console.log("[BetLines] localStorage snapshot:", { ...localStorage });
    console.log("[BetLines] localStorage userBetVector =",
      localStorage.getItem(LOCAL_KEY));
  }, []);

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

      {/* Сфера (Drag) */}
      <mesh ref={sphereRef} scale={[0.5,0.5,0.5]}>
        <sphereGeometry args={[1,16,16]} />
        <meshStandardMaterial color="blue" opacity={0.5} transparent />
      </mesh>
    </>
  );
};

export default BetLines;
