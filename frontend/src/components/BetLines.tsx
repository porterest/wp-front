import React, { useEffect, useRef, useState, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { fetchUserBalances } from "../services/api";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;        // Жёлтая стрелка (агрегированная)
  userPreviousBet: THREE.Vector3;       // Белая стрелка (последняя ставка), приходит из GamePage
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
  // ======== Three/Fiber stuff ========
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // ======== 1) Баланс пользователя ========
  const [userBalance, setUserBalance] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const { balance } = await fetchUserBalances();
        setUserBalance(balance);
      } catch (err) {
        console.error("Failed to fetch user balances:", err);
      }
    })();
  }, []);

  // ======== 2) aggregatorRef (жёлтая стрелка) ========
  // Создаём ref для жёлтой стрелки
  const aggregatorRef = useRef(new THREE.Vector3());

  // При изменении `previousBetEnd` — ограничиваем, пишем в aggregatorRef
  useEffect(() => {
    const agg = previousBetEnd.clone();
    if (agg.length() > maxYellowLength) {
      agg.setLength(maxYellowLength);
    }
    aggregatorRef.current.copy(agg);
  }, [previousBetEnd, maxYellowLength]);

  // ======== 3) Белая стрелка (betPosition) ========
  // Локальный state, который реально управляет положением белой стрелки
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(() => new THREE.Vector3(0,0,0));

  // При обновлении `userPreviousBet` или при первом рендере:
  // Смотрим localStorage, иначе userPreviousBet
  const loadBetPosition = useCallback(() => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        return new THREE.Vector3(arr[0], arr[1], arr[2]);
      }
    } catch (err) {
      console.error("Error parsing localStorage userBetVector:", err);
    }
    // Если нет в localStorage
    return userPreviousBet.clone();
  }, [userPreviousBet]);

  useEffect(() => {
    const bp = loadBetPosition();

    // Ограничиваем относительно aggregator
    const offset = bp.clone().sub(aggregatorRef.current);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      bp.copy(aggregatorRef.current).add(offset);
    }
    setBetPosition(bp);
  }, [loadBetPosition, maxWhiteLength]);

  // ======== 4) Создание 3D объектов: жёлтая и белая линии (конусы, сфера) ========
  const yellowLineRef = useRef<Line2|null>(null);
  const yellowConeRef = useRef<THREE.Mesh|null>(null);

  const whiteLineRef = useRef<Line2|null>(null);
  const whiteConeRef = useRef<THREE.Mesh|null>(null);
  const sphereRef = useRef<THREE.Mesh|null>(null);

  useEffect(() => {
    // ---- создаём жёлтую линию + конус
    {
      const yGeom = new LineGeometry();
      yGeom.setPositions([
        0,0,0,
        aggregatorRef.current.x,
        aggregatorRef.current.y,
        aggregatorRef.current.z,
      ]);
      const yMat = new LineMaterial({
        color:"yellow",
        linewidth:3,
        resolution:new THREE.Vector2(gl.domElement.clientWidth, gl.domElement.clientHeight),
      });
      const yLine = new Line2(yGeom, yMat);
      scene.add(yLine);
      yellowLineRef.current = yLine;

      const coneGeom = new THREE.ConeGeometry(0.1,0.3,12);
      const coneMat = new THREE.MeshStandardMaterial({ color:"yellow" });
      const yCone = new THREE.Mesh(coneGeom, coneMat);
      scene.add(yCone);
      yellowConeRef.current = yCone;
    }

    // ---- создаём белую линию + конус + сферу
    {
      const wGeom = new LineGeometry();
      wGeom.setPositions([
        aggregatorRef.current.x, aggregatorRef.current.y, aggregatorRef.current.z,
        betPosition.x, betPosition.y, betPosition.z,
      ]);
      const wMat = new LineMaterial({
        color:"white",
        linewidth:3,
        resolution:new THREE.Vector2(gl.domElement.clientWidth, gl.domElement.clientHeight),
      });
      const wLine = new Line2(wGeom, wMat);
      scene.add(wLine);
      whiteLineRef.current = wLine;

      const wConeGeom = new THREE.ConeGeometry(0.1,0.3,12);
      const wConeMat = new THREE.MeshStandardMaterial({ color:"white" });
      const wCone = new THREE.Mesh(wConeGeom, wConeMat);
      scene.add(wCone);
      whiteConeRef.current = wCone;

      const sphereGeom = new THREE.SphereGeometry(0.5,16,16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color:"blue",
        opacity:0.5,
        transparent:true,
      });
      const sp = new THREE.Mesh(sphereGeom, sphereMat);
      scene.add(sp);
      sphereRef.current = sp;
    }

    return () => {
      if (yellowLineRef.current) scene.remove(yellowLineRef.current);
      if (yellowConeRef.current) scene.remove(yellowConeRef.current);
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
      if (whiteConeRef.current) scene.remove(whiteConeRef.current);
      if (sphereRef.current) scene.remove(sphereRef.current);
    };
  }, []);

  // ======== 5) useEffect: при изменении aggregatorRef или betPosition => обновить объекты ========
  useEffect(() => {
    // --- Жёлтая линия
    if (yellowLineRef.current?.geometry) {
      const geom = yellowLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        0,0,0,
        aggregatorRef.current.x,
        aggregatorRef.current.y,
        aggregatorRef.current.z,
      ]);
      geom.computeBoundingSphere?.();
    }
    // Жёлтый конус
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(aggregatorRef.current);
      const up = new THREE.Vector3(0,1,0);
      const dir = aggregatorRef.current.clone().normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      yellowConeRef.current.setRotationFromQuaternion(quat);
    }

    // --- Белая линия
    if (whiteLineRef.current?.geometry) {
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        aggregatorRef.current.x, aggregatorRef.current.y, aggregatorRef.current.z,
        betPosition.x, betPosition.y, betPosition.z,
      ]);
      geom.computeBoundingSphere?.();
    }
    // Белый конус
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      const dirW = betPosition.clone().sub(aggregatorRef.current).normalize();
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
  }, [betPosition, aggregatorRef]);

  // ======== 6) Drag =========
  const [isDragging, setIsDragging] = useState(false);

  // Проверяем клик по сфере
  const isClickOnSphere = useCallback((evt: PointerEvent)=> {
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

  const updatePlane = useCallback(()=> {
    const camDir = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(camDir, betPosition);
  }, [camera, betPosition]);

  const handlePointerDown = useCallback((evt: PointerEvent)=> {
    if (isClickOnSphere(evt)) {
      setIsDragging(true);
      onDragging(true);
      updatePlane();
    }
  }, [isClickOnSphere, onDragging, updatePlane]);

  const handlePointerMove = useCallback((evt: PointerEvent)=> {
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

    let newPos = intersect.clone();
    // axisMode
    if (axisMode==="X") {
      newPos.y = betPosition.y;
      newPos.z = betPosition.z;
    } else if (axisMode==="Y") {
      newPos.x = betPosition.x;
      newPos.z = betPosition.z;
    }

    // Ограничим по maxWhiteLength
    const offset = newPos.clone().sub(aggregatorRef.current);
    if (offset.length()>maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      newPos = aggregatorRef.current.clone().add(offset);
    }
    setBetPosition(newPos);

    const fraction = offset.length()/maxWhiteLength;
    setBetAmount(userBalance*fraction);

    handleDrag(newPos);
  }, [
    isDragging, gl.domElement, camera, axisMode,
    betPosition, aggregatorRef, maxWhiteLength,
    userBalance, setBetAmount, handleDrag
  ]);

  const handlePointerUp = useCallback(()=> {
    if (!isDragging) return;
    setIsDragging(false);
    onDragging(false);

    const offset = betPosition.clone().sub(aggregatorRef.current);
    const fraction = Math.min(offset.length()/maxWhiteLength,1);
    const betAmt = fraction*userBalance;
    setBetAmount(betAmt);

    onShowConfirmButton(true, {
      amount: betAmt,
      predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
    });
  }, [
    isDragging, aggregatorRef, betPosition,
    maxWhiteLength, userBalance,
    onDragging, onShowConfirmButton, setBetAmount
  ]);

  useEffect(()=> {
    const c = gl.domElement;
    c.addEventListener("pointerdown", handlePointerDown);
    c.addEventListener("pointermove", handlePointerMove);
    c.addEventListener("pointerup", handlePointerUp);

    return ()=>{
      c.removeEventListener("pointerdown", handlePointerDown);
      c.removeEventListener("pointermove", handlePointerMove);
      c.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp, gl.domElement]);

  return null;
};

export default BetLines;
