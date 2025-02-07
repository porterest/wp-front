import React, { useEffect, useRef, useState, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { fetchUserBalances, getLastUserBet } from "../services/api";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;   // Конец жёлтой стрелки (сервер)
  userPreviousBet: THREE.Vector3;  // Серверная последняя ставка
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
  pair: { value: string }; // Если нужно вызывать getLastUserBet(pair.value)
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
                                             pair,
                                           }) => {
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // ---------- 1) Баланс пользователя ----------
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

  // ---------- 2) ЖЁЛТАЯ СТРЕЛКА (aggregator) ----------
  const aggregatorRef = useRef(new THREE.Vector3());

  // Функция обновления жёлтых объектов (линия+конус)
  const updateYellowObjects = useCallback(() => {
    if (yellowLineRef.current?.geometry) {
      const geom = yellowLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        0, 0, 0,
        aggregatorRef.current.x,
        aggregatorRef.current.y,
        aggregatorRef.current.z,
      ]);
      if (geom.computeBoundingSphere) {
        geom.computeBoundingSphere();
      }
    }
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(aggregatorRef.current);
      const up = new THREE.Vector3(0, 1, 0);
      const dir = aggregatorRef.current.clone().normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      yellowConeRef.current.setRotationFromQuaternion(quat);
    }
  }, []);

  // При изменении previousBetEnd обрезаем и вызываем update
  useEffect(() => {
    const agg = previousBetEnd.clone();
    if (agg.length() > maxYellowLength) {
      agg.setLength(maxYellowLength);
    }
    aggregatorRef.current.copy(agg);
    updateYellowObjects();
  }, [previousBetEnd, maxYellowLength, updateYellowObjects]);

  // ---------- 3) БЕЛАЯ СТРЕЛКА (betPosition) ----------

  const [betPosition, setBetPosition] = useState<THREE.Vector3>(new THREE.Vector3(0,0,0));

  // Асинхронная загрузка:
  //  1) localStorage
  //  2) getLastUserBet(pair.value), если и userPreviousBet==(0,0,0)
  //  3) иначе userPreviousBet
  const loadBetPosition = useCallback(async () => {
    // 1) localStorage
    try {
      const storedStr = localStorage.getItem(LOCAL_KEY);
      if (storedStr) {
        const arr = JSON.parse(storedStr);
        return new THREE.Vector3(arr[0], arr[1], arr[2]);
      }
    } catch (err) {
      console.error("Ошибка парсинга localStorage userBetVector:", err);
    }

    // 2) Если userPreviousBet==(0,0,0), пробуем getLastUserBet
    if (userPreviousBet.x === 0 && userPreviousBet.y === 0 && userPreviousBet.z === 0) {
      try {
        const lastBet = await getLastUserBet(pair.value);
        if (!lastBet || !lastBet.vector) {
          console.warn("getLastUserBet не вернул vector:", lastBet);
          return new THREE.Vector3(0,0,0);
        }
        // Ожидаем lastBet.vector=[x,y]
        return new THREE.Vector3(lastBet.vector[0], lastBet.vector[1], 0);
      } catch (err) {
        console.error("Ошибка getLastUserBet:", err);
        return new THREE.Vector3(0,0,0);
      }
    }

    // 3) Иначе используем userPreviousBet
    return userPreviousBet.clone();
  }, [userPreviousBet, pair.value]);

  // При монтировании и при обновлении userPreviousBet — грузим
  useEffect(() => {
    (async () => {
      const bp = await loadBetPosition();

      // Ограничим относительно aggregator
      const offset = bp.clone().sub(aggregatorRef.current);
      if (offset.length() > maxWhiteLength) {
        offset.setLength(maxWhiteLength);
        bp.copy(aggregatorRef.current).add(offset);
      }
      setBetPosition(bp);
    })();
  }, [loadBetPosition, maxWhiteLength]);

  // ---------- 4) Создаём объекты 3D (линии, конусы, сферу) один раз ----------
  const yellowLineRef = useRef<Line2|null>(null);
  const yellowConeRef = useRef<THREE.Mesh|null>(null);

  const whiteLineRef = useRef<Line2|null>(null);
  const whiteConeRef = useRef<THREE.Mesh|null>(null);
  const sphereRef = useRef<THREE.Mesh|null>(null);

  useEffect(() => {
    // YELLOW line & cone
    {
      const yGeom = new LineGeometry();
      yGeom.setPositions([0,0,0, aggregatorRef.current.x, aggregatorRef.current.y, aggregatorRef.current.z]);
      const yMat = new LineMaterial({
        color: "yellow",
        linewidth: 3,
        resolution: new THREE.Vector2(gl.domElement.clientWidth, gl.domElement.clientHeight),
      });
      const yLine = new Line2(yGeom, yMat);
      scene.add(yLine);
      yellowLineRef.current = yLine;

      const yConeGeom = new THREE.ConeGeometry(0.1,0.3,12);
      const yConeMat = new THREE.MeshStandardMaterial({ color: "yellow" });
      const yCone = new THREE.Mesh(yConeGeom, yConeMat);
      scene.add(yCone);
      yellowConeRef.current = yCone;
    }

    // WHITE line & cone & sphere
    {
      const wGeom = new LineGeometry();
      wGeom.setPositions([
        aggregatorRef.current.x, aggregatorRef.current.y, aggregatorRef.current.z,
        betPosition.x, betPosition.y, betPosition.z,
      ]);
      const wMat = new LineMaterial({
        color: "white",
        linewidth: 3,
        resolution: new THREE.Vector2(gl.domElement.clientWidth, gl.domElement.clientHeight),
      });
      const wLine = new Line2(wGeom, wMat);
      scene.add(wLine);
      whiteLineRef.current = wLine;

      const wConeGeom = new THREE.ConeGeometry(0.1, 0.3, 12);
      const wConeMat = new THREE.MeshStandardMaterial({ color: "white" });
      const wCone = new THREE.Mesh(wConeGeom, wConeMat);
      scene.add(wCone);
      whiteConeRef.current = wCone;

      const sphereGeom = new THREE.SphereGeometry(0.5,16,16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color:"blue",
        opacity:0.5,
        transparent:true
      });
      const sp = new THREE.Mesh(sphereGeom, sphereMat);
      scene.add(sp);
      sphereRef.current = sp;
    }

    // cleanup
    return () => {
      if (yellowLineRef.current) scene.remove(yellowLineRef.current);
      if (yellowConeRef.current) scene.remove(yellowConeRef.current);
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
      if (whiteConeRef.current) scene.remove(whiteConeRef.current);
      if (sphereRef.current) scene.remove(sphereRef.current);
    };
  }, []);

  // ---------- 5) useEffect: при aggregatorRef / betPosition обновляем объекты ----------
  useEffect(() => {
    // YELLOW line
    if (yellowLineRef.current?.geometry) {
      const geom = yellowLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        0,0,0,
        aggregatorRef.current.x,
        aggregatorRef.current.y,
        aggregatorRef.current.z,
      ]);
      if (geom.computeBoundingSphere) {
        geom.computeBoundingSphere();
      }
    }
    // YELLOW cone
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(aggregatorRef.current);
      const up = new THREE.Vector3(0,1,0);
      const dir = aggregatorRef.current.clone().normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      yellowConeRef.current.setRotationFromQuaternion(quat);
    }

    // WHITE line
    if (whiteLineRef.current?.geometry) {
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        aggregatorRef.current.x, aggregatorRef.current.y, aggregatorRef.current.z,
        betPosition.x, betPosition.y, betPosition.z,
      ]);
      if (geom.computeBoundingSphere) {
        geom.computeBoundingSphere();
      }
    }
    // WHITE cone
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      const dirW = betPosition.clone().sub(aggregatorRef.current).normalize();
      if (dirW.length()>0) {
        const up = new THREE.Vector3(0,1,0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }
    // sphere
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }
  }, [betPosition, aggregatorRef]);

  // ---------- 6) Drag ----------
  const [isDragging, setIsDragging] = useState(false);

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

    let newPos = intersectPt.clone();
    if (axisMode==="X") {
      newPos.y = betPosition.y;
      newPos.z = betPosition.z;
    } else if (axisMode==="Y") {
      newPos.x = betPosition.x;
      newPos.z = betPosition.z;
    }

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

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    onDragging(false);

    const offset = betPosition.clone().sub(aggregatorRef.current);
    const fraction = Math.min(offset.length()/maxWhiteLength, 1);
    const betAmt = fraction*userBalance;
    setBetAmount(betAmt);

    console.log("PointerUp => final bet:", betPosition.toArray(), betAmt);
    onShowConfirmButton(true, {
      amount: betAmt,
      predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
    });
  }, [
    isDragging, onDragging,
    aggregatorRef, betPosition,
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
  }, [handlePointerDown, handlePointerMove, handlePointerUp, gl.domElement]);

  return null;
};

export default BetLines;
