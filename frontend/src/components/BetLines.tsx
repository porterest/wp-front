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
  previousBetEnd: THREE.Vector3;  // Жёлтая стрелка (агрегированная)
  userPreviousBet: THREE.Vector3; // Белая стрелка (прошлая ставка, может прийти с бэка)
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
  // ===== THREE & references
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  const yellowLineRef = useRef<Line2|null>(null);
  const whiteLineRef = useRef<Line2|null>(null);
  const yellowConeRef = useRef<THREE.Mesh|null>(null);
  const whiteConeRef = useRef<THREE.Mesh|null>(null);
  const sphereRef = useRef<THREE.Mesh|null>(null);

  // ===== Drag state
  const [isDragging, setIsDragging] = useState(false);

  // ===== User balance
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

  // ===== 1) aggregatorClipped (жёлтая)
  //     Обрезаем previousBetEnd по maxYellowLength
  const aggregatorClipped = useMemo(() => {
    const depositVec = previousBetEnd.clone();
    if (depositVec.length() > maxYellowLength) {
      depositVec.setLength(maxYellowLength);
    }
    console.log("[BetLines] aggregatorClipped =", depositVec.toArray());
    return depositVec;
  }, [previousBetEnd, maxYellowLength]);

  // ===== 2) betPosition (белая стрелка)
  // Сначала смотрим localStorage (логируем), если там есть — берём. Иначе userPreviousBet
  // Затем ОБРЕЗАЕМ по maxWhiteLength (вы просили вернуть «как и раньше»).
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      console.log("[BetLines] localStorage content for userBetVector =>", stored);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length>=3) {
          const fromLS = new THREE.Vector3(arr[0], arr[1], arr[2]);
          console.log("[BetLines] betPosition from localStorage (before clip) =", fromLS.toArray());
          return fromLS;
        }
      }
    } catch (err) {
      console.error("[BetLines] parse localStorage error:", err);
    }
    console.log("[BetLines] betPosition from userPreviousBet (before clip) =", userPreviousBet.toArray());
    return userPreviousBet.clone();
  });

  // Обрезаем betPosition при монтировании
  useEffect(() => {
    const offset = betPosition.clone().sub(aggregatorClipped);
    if (offset.length()> maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      const clippedPos = aggregatorClipped.clone().add(offset);
      setBetPosition(clippedPos);
      console.log("[BetLines] betPosition clipped at mount =>", clippedPos.toArray());
    }
  }, []); // Однократно при монтировании

  // Если userPreviousBet меняется (пришло что-то новое с бэка),
  // => тоже обновляем betPosition (с обрезанием).
  useEffect(() => {
    console.log("[BetLines] userPreviousBet changed =>", userPreviousBet.toArray());
    const dir = userPreviousBet.clone().sub(aggregatorClipped);
    if (dir.length()> maxWhiteLength) {
      dir.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(dir);
    }
    setBetPosition(userPreviousBet.clone());
  }, [userPreviousBet, aggregatorClipped, maxWhiteLength]);

  // ===== 3) Создаём объекты (линии, конусы, сферу) один раз
  useEffect(() => {
    console.log("[BetLines] Creating lines, cones, sphere (ONE TIME)");

    // --- Жёлтая линия
    {
      const yGeom = new LineGeometry();
      yGeom.setPositions([
        0,0,0,
        aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z
      ]);
      const yMat = new LineMaterial({
        color:"yellow",
        linewidth:3,
        resolution:new THREE.Vector2(window.innerWidth, window.innerHeight)
      });
      const yLine = new Line2(yGeom, yMat);
      yellowLineRef.current = yLine;
      scene.add(yLine);

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
    }

    // --- Белая линия
    {
      const wGeom = new LineGeometry();
      wGeom.setPositions([
        aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z,
        betPosition.x,       betPosition.y,       betPosition.z
      ]);
      const wMat = new LineMaterial({
        color:"white",
        linewidth:3,
        resolution:new THREE.Vector2(window.innerWidth, window.innerHeight)
      });
      const wLine = new Line2(wGeom, wMat);
      whiteLineRef.current = wLine;
      scene.add(wLine);

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
    }

    return () => {
      if (yellowLineRef.current) scene.remove(yellowLineRef.current);
      if (yellowConeRef.current) scene.remove(yellowConeRef.current);
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
      if (whiteConeRef.current) scene.remove(whiteConeRef.current);
      if (sphereRef.current) scene.remove(sphereRef.current);
    };
  }, []);

  // ===== useEffect: при aggregatorClipped / betPosition => обновляем объекты
  useEffect(() => {
    console.log("[BetLines] aggregatorClipped=", aggregatorClipped.toArray(),
      "betPosition=", betPosition.toArray()
    );

    // Жёлтая
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

    // Белая
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

  // ===== Drag logic
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
  }, [camera, betPosition]);

  const handlePointerDown = useCallback((evt: PointerEvent) => {
    if (isClickOnSphere(evt)) {
      setIsDragging(true);
      onDragging(true);
      updatePlane();
      console.log("[BetLines] pointerDown => drag start");
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

    const intersect = new THREE.Vector3();
    if (!raycaster.current.ray.intersectPlane(plane.current, intersect)) {
      return;
    }

    // direction = intersect - aggregatorClipped
    const direction = intersect.clone().sub(aggregatorClipped);
    // newPos = copy of betPosition, then we only add direction.x or direction.y
    // to preserve the other coordinate
    let newPos = betPosition.clone();

    if (axisMode==="X") {
      newPos.x = aggregatorClipped.x + direction.x;
    } else if (axisMode==="Y") {
      newPos.y = aggregatorClipped.y + direction.y;
    } else {
      newPos = aggregatorClipped.clone().add(direction);
    }

    // clamp by maxWhiteLength
    const finalDir = newPos.clone().sub(aggregatorClipped);
    if (finalDir.length()> maxWhiteLength) {
      finalDir.setLength(maxWhiteLength);
      newPos = aggregatorClipped.clone().add(finalDir);
    }

    setBetPosition(newPos);

    // fraction
    const fraction = finalDir.length()/maxWhiteLength;
    setBetAmount(userBalance*fraction);

    handleDrag(newPos);
  }, [
    isDragging, aggregatorClipped, betPosition, axisMode, camera,
    gl.domElement, maxWhiteLength, userBalance,
    handleDrag, setBetAmount
  ]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    onDragging(false);

    const finalDir = betPosition.clone().sub(aggregatorClipped);
    const fraction = Math.min(finalDir.length()/maxWhiteLength,1);
    const betAmt = fraction* userBalance;
    setBetAmount(betAmt);

    console.log("[BetLines] pointerUp => final betPosition=", betPosition.toArray(),
      "betAmt=", betAmt);

    onShowConfirmButton(true, {
      amount: betAmt,
      predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
    });
  }, [
    isDragging, onDragging,
    aggregatorClipped, betPosition,
    maxWhiteLength, userBalance,
    setBetAmount, onShowConfirmButton
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

      {/* Сфера (drag point) */}
      <mesh ref={sphereRef} scale={[0.5,0.5,0.5]}>
        <sphereGeometry args={[1,16,16]} />
        <meshStandardMaterial color="blue" opacity={0.5} transparent />
      </mesh>
    </>
  );
};

export default BetLines;
