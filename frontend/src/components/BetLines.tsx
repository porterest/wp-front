import React, {
  useEffect,
  useRef,
  useState,
  MutableRefObject,
  useCallback,
} from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from "lodash.debounce";
// import { DebouncedFunc } from "lodash";
import { fetchUserBalances } from "../services/api";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3; // Конец жёлтой линии (абсолютная координата)
  userPreviousBet: THREE.Vector3; // Конец белой линии (абсолютная координата)
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: {
      amount: number;
      predicted_vector: number[];
    }
  ) => void;
  // maxYellowLength: number; // Макс. длина жёлтой (если хотите использовать — см. комментарии)
  maxWhiteLength: number; // Макс. длина белой (применяется в Drag, см. handlePointerMove)
  handleDrag: (newPosition: THREE.Vector3) => void;
  axisMode: "X" | "Y";
  setBetAmount: (newAmount: number) => void;
}

/**
 * Компонент BetLines:
 * - Жёлтая линия: (0,0,0) -> previousBetEnd (без обрезания).
 * - Белая линия:previousBetEnd -> userPreviousBet (без обрезания).
 * - Поддержка Drag для «белой» точки (от конца жёлтой).
 * - Если надо при отрисовке *тоже* ограничивать белую, раскомментируйте место, помеченное "если нужно обрезать".
 */
const BetLines: React.FC<BetLinesProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             // maxYellowLength,
                                             maxWhiteLength,
                                             handleDrag,
                                             axisMode,
                                             setBetAmount,
                                           }) => {
  // ------------------------- РЕФЫ -------------------------
  const yellowLineRef = useRef<Line2 | null>(null) as MutableRefObject<Line2 | null>;
  const whiteLineRef = useRef<Line2 | null>(null) as MutableRefObject<Line2 | null>;
  const sphereRef = useRef<THREE.Mesh | null>(null) as MutableRefObject<THREE.Mesh | null>;
  const yellowConeRef = useRef<THREE.Mesh | null>(null) as MutableRefObject<THREE.Mesh | null>;
  const whiteConeRef = useRef<THREE.Mesh | null>(null) as MutableRefObject<THREE.Mesh | null>;

  // Drag
  const [isDragging, setIsDragging] = useState(false);

  // Баланс юзера
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

  // ---------------------- ИТОГОВЫЕ ВЕКТОРЫ (БЕЗ обрезания) ---------------------
  // ЖЁЛТЫЙ: (0,0,0) -> aggregatorVec
  // Раньше вы делали aggregatorClipped = setLength(...) — теперь убираем, чтобы не менять угол.
  const aggregatorVec = previousBetEnd.clone();

  // БЕЛЫЙ: (aggregatorVec) -> userBetVec
  // (т.е. белая линия рисуется от aggregatorVec до userBetVec)
  // Ниже при drag будем менять "betPosition".
  // При первой отрисовке показываем ровно те данные, что пришли.
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(() => {
    const initPos = userPreviousBet.clone();

    // Если ВАМ надо обрезать белую сразу при отрисовке - раскомментируйте:
    /*
    const offset = initPos.clone().sub(aggregatorVec);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      initPos.copy(aggregatorVec).add(offset);
    }
    */

    return initPos;
  });

  // Если userPreviousBet меняется извне:
  useEffect(() => {
    const newPos = userPreviousBet.clone();

    // Если надо обрезать сразу - раскомментируйте:
    /*
    const offset = newPos.clone().sub(aggregatorVec);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      newPos.copy(aggregatorVec).add(offset);
    }
    */

    setBetPosition(newPos);
  }, [userPreviousBet, aggregatorVec, maxWhiteLength]);

  // ---------------------- ИНИЦИАЛИЗАЦИЯ THREE ----------------------
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // ---------------------- Debounce для обновления геометрии белой линии ----------------------
  function updateWhiteLine(pos: THREE.Vector3) {
    if (!whiteLineRef.current || !whiteLineRef.current.geometry) return;
    const geom = whiteLineRef.current.geometry as LineGeometry;
    geom.setPositions([
      aggregatorVec.x, aggregatorVec.y, aggregatorVec.z,
      pos.x, pos.y, pos.z,
    ]);
    geom.computeBoundingSphere?.();
  }

  // @ts-expect-error meow
  const debouncedUpdateWhiteLine = debounce((pos: THREE.Vector3) => {
      updateWhiteLine(pos);
    },
    15
  ) as (...args: [THREE.Vector3]) => void;


  // ---------------------- ЖЁЛТАЯ ЛИНИЯ И КОНУС ----------------------
  useEffect(() => {
    // Линия жёлтая: (0,0,0) -> aggregatorVec
    const yGeom = new LineGeometry();
    yGeom.setPositions([0, 0, 0, aggregatorVec.x, aggregatorVec.y, aggregatorVec.z]);
    const yMat = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    const yLine = new Line2(yGeom, yMat);
    yellowLineRef.current = yLine;
    scene.add(yLine);

    // Жёлтый конус на aggregatorVec
    const yc = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "yellow" })
    );
    yc.position.copy(aggregatorVec);

    // Повернём конус
    const dir = aggregatorVec.clone().normalize();
    if (dir.length() > 0) {
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      yc.setRotationFromQuaternion(quat);
    }
    yellowConeRef.current = yc;
    scene.add(yc);

    return () => {
      if (yellowLineRef.current) scene.remove(yellowLineRef.current);
      if (yellowConeRef.current) scene.remove(yellowConeRef.current);
    };
  }, [aggregatorVec, scene]);

  // ---------------------- БЕЛАЯ ЛИНИЯ И КОНУС ----------------------
  useEffect(() => {
    // Линия: aggregatorVec -> betPosition
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      aggregatorVec.x, aggregatorVec.y, aggregatorVec.z,
      betPosition.x,   betPosition.y,   betPosition.z,
    ]);
    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    const wLine = new Line2(wGeom, wMat);
    whiteLineRef.current = wLine;
    scene.add(wLine);

    // Белый конус на конце betPosition
    const wc = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "white" })
    );
    wc.position.copy(betPosition);
    const dirW = betPosition.clone().sub(aggregatorVec).normalize();
    if (dirW.length() > 0) {
      const up = new THREE.Vector3(0, 1, 0);
      const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
      wc.setRotationFromQuaternion(quatW);
    }
    whiteConeRef.current = wc;
    scene.add(wc);

    // Сфера (drag point)
    const sp = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshStandardMaterial({
        color: "blue",
        opacity: 0.5,
        transparent: true,
      })
    );
    sp.position.copy(betPosition);
    sphereRef.current = sp;
    scene.add(sp);

    return () => {
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
      if (whiteConeRef.current) scene.remove(whiteConeRef.current);
      if (sphereRef.current) scene.remove(sphereRef.current);
    };
  }, [aggregatorVec, betPosition, scene]);

  // ---------------------- ОБНОВЛЕНИЕ белой линии, конуса и сферы при изменении betPosition ----------------------
  useEffect(() => {
    // Линия
    if (whiteLineRef.current && whiteLineRef.current.geometry) {
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        aggregatorVec.x, aggregatorVec.y, aggregatorVec.z,
        betPosition.x, betPosition.y, betPosition.z,
      ]);
      geom.computeBoundingSphere?.();
    }
    // Конус
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      const dirW = betPosition.clone().sub(aggregatorVec).normalize();
      if (dirW.length() > 0) {
        const up = new THREE.Vector3(0, 1, 0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }
    // Сфера
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }
  }, [aggregatorVec, betPosition]);

  // ---------------------- ЛОГИКА DRAG & DROP ----------------------
  const isClickOnSphere = useCallback(
    (event: PointerEvent): boolean => {
      if (!sphereRef.current) return false;
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.current.setFromCamera(mouse, camera);
      const hits = raycaster.current.intersectObject(sphereRef.current);
      return hits.length > 0;
    },
    [camera, gl.domElement]
  );

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

      const intersectPt = new THREE.Vector3();
      if (!raycaster.current.ray.intersectPlane(plane.current, intersectPt)) {
        return;
      }

      // direction = точка пересечения - aggregatorVec
      // т.к. белая линия идёт от aggregatorVec.
      const direction = intersectPt.clone().sub(aggregatorVec);

      // Соберём новую позицию
      const updatedPos = aggregatorVec.clone().add(direction);

      // Учитываем axisMode
      if (axisMode === "X") {
        updatedPos.y = betPosition.y; // оставляем y, как было
        updatedPos.z = betPosition.z; // если нужна строгая 2D, z=betPosition.z
      } else if (axisMode === "Y") {
        updatedPos.x = betPosition.x;
        updatedPos.z = betPosition.z;
      }

      // Ограничиваем длину белой линии, если нужно
      const finalDir = updatedPos.clone().sub(aggregatorVec);
      if (finalDir.length() > maxWhiteLength) {
        finalDir.setLength(maxWhiteLength);
        updatedPos.copy(aggregatorVec).add(finalDir);
      }

      setBetPosition(updatedPos);
      debouncedUpdateWhiteLine(updatedPos);

      // Считаем долю (0..1)
      const fraction = finalDir.length() / maxWhiteLength;
      setBetAmount(userBalance * fraction);

      handleDrag(updatedPos);
    },
    [
      isDragging,
      aggregatorVec,
      betPosition,
      axisMode,
      maxWhiteLength,
      gl.domElement,
      camera,
      plane,
      userBalance,
      debouncedUpdateWhiteLine,
      setBetAmount,
      handleDrag,
    ]
  );

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);

      const finalDir = betPosition.clone().sub(aggregatorVec);
      const fraction = Math.min(finalDir.length() / maxWhiteLength, 1);
      const betAmount = fraction * userBalance;

      onShowConfirmButton(true, {
        amount: betAmount,
        predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
      });
    }
  }, [
    isDragging,
    onDragging,
    betPosition,
    aggregatorVec,
    maxWhiteLength,
    userBalance,
    onShowConfirmButton,
  ]);

  // ---------------------- ПОДПИСКА НА СОБЫТИЯ ----------------------
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

  // useFrame(() => { /* пусто */ });

  return null;
};

export default BetLines;
