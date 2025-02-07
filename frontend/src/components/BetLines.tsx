import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from "lodash.debounce";
import { fetchUserBalances } from "../services/api";
import { DebouncedFunc } from "lodash";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3; // Жёлтая линия (агрегированная)
  userPreviousBet: THREE.Vector3; // Белая линия (прошлая ставка), может совпадать, если ставки не было
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
  // References
  const yellowLineRef = useRef<Line2|null>(null);
  const whiteLineRef = useRef<Line2|null>(null);
  const sphereRef = useRef<THREE.Mesh|null>(null);
  const yellowConeRef = useRef<THREE.Mesh|null>(null);
  const whiteConeRef = useRef<THREE.Mesh|null>(null);

  // Состояния
  const [isDragging, setIsDragging] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  // THREE
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // 1) Загрузка баланса
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

  // 2) aggregatorClipped (жёлтая линия)
  const aggregatorClipped = useMemo(() => {
    // Обрезаем previousBetEnd до maxYellowLength
    const depositVec = previousBetEnd.clone();
    if (depositVec.length() > maxYellowLength) {
      depositVec.setLength(maxYellowLength);
    }
    return depositVec;
  }, [previousBetEnd, maxYellowLength]);

  // 3) Состояние для белой стрелки
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(() => userPreviousBet.clone());

  // При каждом обновлении userPreviousBet — обрезаем его
  useEffect(() => {
    const initPos = userPreviousBet.clone();
    const betDir = initPos.clone().sub(aggregatorClipped);
    if (betDir.length() > maxWhiteLength) {
      betDir.setLength(maxWhiteLength);
      initPos.copy(aggregatorClipped).add(betDir);
    }
    setBetPosition(initPos);
  }, [userPreviousBet, aggregatorClipped, maxWhiteLength]);

  // Debounced обновление белой линии
  const debouncedUpdateWhiteLine = useMemo(() =>
    debounce((pos) => {
      const position = pos as THREE.Vector3;
      if (!whiteLineRef.current || !whiteLineRef.current.geometry) return;
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z,
        position.x, position.y, position.z
      ]);
      geom.computeBoundingSphere?.();
    }, 15) as DebouncedFunc<(pos: THREE.Vector3) => void>, []
  );


  // 4) Инициализация (отрисовка) жёлтой + белой линии, + конусов + сферы
  useEffect(() => {
    // --- Жёлтая линия
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
      if (dir.length() > 0) {
        const up = new THREE.Vector3(0,1,0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        yCone.setRotationFromQuaternion(quat);
      }
    }
    yellowConeRef.current = yCone;
    scene.add(yCone);

    // --- Белая линия
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

    // Сфера для Drag
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

    return () => {
      if (yLine) scene.remove(yLine);
      if (yCone) scene.remove(yCone);
      if (wLine) scene.remove(wLine);
      if (wCone) scene.remove(wCone);
      if (sph)   scene.remove(sph);
    };
  }, [aggregatorClipped, betPosition, scene]);

  // 5) При изменении betPosition или aggregatorClipped — обновляем геометрию, конусы, сферу
  useEffect(() => {
    // Жёлтый line
    if (yellowLineRef.current?.geometry) {
      const geom = yellowLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        0,0,0,
        aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z
      ]);
      geom.computeBoundingSphere?.();
    }
    // Жёлтый конус
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(aggregatorClipped);
      const dir = aggregatorClipped.clone().normalize();
      if (dir.length()>0) {
        const up = new THREE.Vector3(0,1,0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }

    // Белая line
    if (whiteLineRef.current?.geometry) {
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z,
        betPosition.x, betPosition.y, betPosition.z
      ]);
      geom.computeBoundingSphere?.();
    }
    // Белый конус
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      const dirW = betPosition.clone().sub(aggregatorClipped).normalize();
      if (dirW.length()>0) {
        const up = new THREE.Vector3(0,1,0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }
    // Сфера
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }
  }, [aggregatorClipped, betPosition]);

  // 6) Drag-логика
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
      return;
    }

    const direction = intersectPt.clone().sub(aggregatorClipped);
    let updatedPos = betPosition.clone();

    // Применяем axisMode
    const partialPos = aggregatorClipped.clone().add(direction);
    if (axisMode==="X") {
      updatedPos.x = partialPos.x;
    } else if (axisMode==="Y") {
      updatedPos.y = partialPos.y;
    }

    // Ограничиваем по maxWhiteLength
    const finalDir = updatedPos.clone().sub(aggregatorClipped);
    if (finalDir.length()>maxWhiteLength) {
      finalDir.setLength(maxWhiteLength);
      updatedPos = aggregatorClipped.clone().add(finalDir);
    }

    setBetPosition(updatedPos);
    debouncedUpdateWhiteLine(updatedPos);

    // Считаем fraction
    const fraction = finalDir.length() / maxWhiteLength;
    setBetAmount(userBalance * fraction);

    handleDrag(updatedPos);
  }, [
    isDragging, aggregatorClipped, betPosition,
    axisMode, gl.domElement, camera,
    maxWhiteLength, userBalance,
    setBetAmount, handleDrag
  ]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    onDragging(false);

    // При отпускании считаем финальную ставку
    const finalDir = betPosition.clone().sub(aggregatorClipped);
    const fraction = Math.min(finalDir.length() / maxWhiteLength, 1);
    const betAmt = fraction* userBalance;
    setBetAmount(betAmt);

    onShowConfirmButton(true, {
      amount: betAmt,
      predicted_vector: [betPosition.x, betPosition.y, betPosition.z]
    });
  }, [
    isDragging, onDragging, aggregatorClipped,
    betPosition, maxWhiteLength, userBalance,
    onShowConfirmButton, setBetAmount
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
  }, [handlePointerDown, handlePointerMove, handlePointerUp, gl.domElement]);

  // frame
  useFrame(() => { /* пусто */ });

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

      {/* Сфера (drag) */}
      <mesh ref={sphereRef} scale={[0.5,0.5,0.5]}>
        <sphereGeometry args={[1,16,16]} />
        <meshStandardMaterial color="blue" opacity={0.5} transparent />
      </mesh>
    </>
  );
};

export default BetLines;
