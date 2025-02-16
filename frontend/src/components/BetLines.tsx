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
  setBetAmount: (newAmount: number) => void;
  axisMode: "X" | "Y";
  visible: boolean;
}

const LOCAL_KEY = "userBetVector";

// Функция для проверки, является ли вектор нулевым (с учетом эпсилон)
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
                                             setBetAmount,
                                             axisMode,
                                             visible,
                                           }) => {
  const { gl, camera } = useThree();
  // Создаем группу – она будет добавлена в сцену через JSX
  const groupRef = useRef<THREE.Group>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // Ссылки на созданные объекты
  const yellowLineRef = useRef<Line2 | null>(null);
  const yellowConeRef = useRef<THREE.Mesh | null>(null);
  const whiteLineRef = useRef<Line2 | null>(null);
  const whiteConeRef = useRef<THREE.Mesh | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const [aggregatorClipped, setAggregatorClipped] = useState<THREE.Vector3>(new THREE.Vector3());

  // Состояние перетаскивания
  const [isDragging, setIsDragging] = useState(false);
  // Баланс пользователя
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

  // Нормализуем вектор агрегатора
  useEffect(() => {
    console.log("previousBetEnd изменился:");
    console.log(previousBetEnd);

    const agg = previousBetEnd.clone();
    if (agg.length() > maxYellowLength) {
      agg.setLength(maxYellowLength);
    }
    setAggregatorClipped(agg);
    console.log("agg.x, agg.y");
    console.log(agg.x, agg.y);
  }, [previousBetEnd, maxYellowLength]);
  // Флаг, равен ли userPreviousBet (0,0,0)
  const isUserBetZero = useMemo(
    () =>
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 0,
    [userPreviousBet]
  );

// Инициализация белого вектора (betPosition)
  const [betPosition, setBetPosition] = useState<THREE.Vector3 | null>(() => {
    // Проверяем наличие сохранённого вектора в localStorage
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      console.log("[BetLines] Проверяем localStorage, содержимое:", stored);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length >= 3) {
          console.log("[BetLines] Ситуация: белый вектор найден из LS:", arr);
          return new THREE.Vector3(arr[0], arr[1], 1);
        }
      }
    } catch (err) {
      console.error("[BetLines] Ошибка парсинга LS:", err);
    }

    // Если пользовательской ставки нет, используем конец жёлтого вектора + минимальное смещение
    if (isUserBetZero) {
      console.log("[BetLines] Нет userPreviousBet. Используем конец жёлтого вектора с маленьким смещением.");
      const minDelta = 0.0001;
      // Начинаем со значения агрегатора
      let baseVector = aggregatorClipped.clone();
      // Если агрегатора нет (нулевой вектор), задаём значение по умолчанию.
      if (isVectorZero(baseVector)) {
        baseVector = new THREE.Vector3(3, 3, 1);
      }
      // Вычисляем направление смещения, нормализуя базовый вектор
      const direction = baseVector.clone().normalize();
      if (direction.length() === 0) {
        direction.set(1, 0, 0);
      }
      const offset = direction.multiplyScalar(minDelta);
      // Итоговый белый вектор: конец агрегатора + offset, с z = 1
      return baseVector.add(offset).setZ(1);
    }

    // Если же ставка задана – используем её, ограничивая по длине вектора.
    console.log("[BetLines] Есть и агрегатор, и userPreviousBet.");
    const dir = userPreviousBet.clone().sub(aggregatorClipped);
    if (dir.length() > maxWhiteLength) {
      dir.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(dir);
    }
    return userPreviousBet.clone();
  });


// Обновление betPosition при изменении userPreviousBet
  useEffect(() => {
    console.log("[BetLines] userPreviousBet изменился:", userPreviousBet.toArray());
    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored) {
      console.log("[BetLines] LS присутствует – не обновляем betPosition");
      return;
    }
    // Если ставки пользователя нет (определяем по тому, что вектор равен (0,0,1))
    if (
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 1
    ) {
      console.log("[BetLines] userPreviousBet равен (0,0,1) – устанавливаем betPosition как aggregatorClipped + смещение");
      if (axisMode === "X") {
        setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0.001, 0, 0)).setZ(1));
      } else if (axisMode === "Y") {
        setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0, 0.001, 0)).setZ(1));
      } else {
        setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0.001, 0.001, 0)).setZ(1));
      }
      return;
    }
    // Если ставка задана, вычисляем смещение относительно агрегатора
    const offset = userPreviousBet.clone().sub(aggregatorClipped);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(offset);
    }
    console.log("[BetLines] Обновлён betPosition:", userPreviousBet.toArray());
    setBetPosition(userPreviousBet.clone());
  }, [userPreviousBet, aggregatorClipped, maxWhiteLength, axisMode, isDragging]);


  // ===== Создание жёлтых объектов (линия и конус) =====
  useEffect(() => {
    if (!visible || isVectorZero(aggregatorClipped)) return;
    if (!groupRef.current) return;
    // Желтая линия
    const yGeom = new LineGeometry();
    console.log("aggregatorClipped")
    console.log(aggregatorClipped)
    yGeom.setPositions([
      0, 0, 0,
      aggregatorClipped.x,
      aggregatorClipped.y,
      1
    ]);
    console.log("создание желтой линии");
    console.log(yGeom.attributes.position.array);

    const yMat = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
    });
    const yLine = new Line2(yGeom, yMat);
    yellowLineRef.current = yLine;
    groupRef.current.add(yLine);
    console.log(yLine);

    // Желтый конус
    const yCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "yellow" })
    );
    yCone.position.copy(aggregatorClipped);
    yCone.position.z = 1;
    {
      // Вычисляем направление от (0,0,0) до (aggregatorClipped.x, aggregatorClipped.y, 1)
      const desiredDir = new THREE.Vector3(aggregatorClipped.x, aggregatorClipped.y, 1).normalize();
      const defaultDir = new THREE.Vector3(0, 1, 0);
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        yCone.setRotationFromQuaternion(quat);
      }
    }
    yellowConeRef.current = yCone;
    console.log("yCone.position");
    console.log(yCone.position);
    groupRef.current.add(yCone);

    return () => {
      if (groupRef.current && yellowLineRef.current) {
        groupRef.current.remove(yellowLineRef.current);
      }
      if (groupRef.current && yellowConeRef.current) {
        groupRef.current.remove(yellowConeRef.current);
      }
    };
  }, [aggregatorClipped, visible]);

  // ===== Создание белых объектов (линия, конус и сфера) =====
  useEffect(() => {
    if (!visible) return;
    if (!groupRef.current) return;
    if (!betPosition) {
      console.log("[BetLines] НЕТ betPosition – не создаём белые объекты");
      if (groupRef.current && whiteLineRef.current) groupRef.current.remove(whiteLineRef.current);
      if (groupRef.current && whiteConeRef.current) groupRef.current.remove(whiteConeRef.current);
      if (groupRef.current && sphereRef.current) groupRef.current.remove(sphereRef.current);
      whiteLineRef.current = null;
      whiteConeRef.current = null;
      sphereRef.current = null;
      return;
    } else {
      console.log("[BetLines] Есть и агрегатор, и betPosition – создаём белые объекты:", betPosition.toArray());
    }

    // Белая линия
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      aggregatorClipped.x,
      aggregatorClipped.y,
      1,
      betPosition.x,
      betPosition.y,
      1
    ]);
    console.log('белая линия')
    console.log([
      aggregatorClipped.x,
      aggregatorClipped.y,
      1,
      betPosition.x,
      betPosition.y,
      1
    ])
    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
    });
    const wLine = new Line2(wGeom, wMat);
    whiteLineRef.current = wLine;
    groupRef.current.add(wLine);

    // Белый конус
    const wCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "white" })
    );
    {
      const defaultDir = new THREE.Vector3(0, 1, 0);
      let desiredDir: THREE.Vector3;
      if (isUserBetZero) {
        desiredDir = new THREE.Vector3(betPosition.x, betPosition.y, 1).normalize();
      } else {
        desiredDir = betPosition.clone().sub(aggregatorClipped).normalize();
      }
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        wCone.setRotationFromQuaternion(quat);
      }
    }
    whiteConeRef.current = wCone;
    groupRef.current.add(wCone);

    // Сфера
    const sph = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshStandardMaterial({
        color: "blue",
        opacity: 0.5,
        transparent: true
      })
    );
    sph.position.copy(betPosition);
    sph.position.z = 1;
    sphereRef.current = sph;
    groupRef.current.add(sph);

    return () => {
      if (groupRef.current && whiteLineRef.current) {
        groupRef.current.remove(whiteLineRef.current);
      }
      if (groupRef.current && whiteConeRef.current) {
        groupRef.current.remove(whiteConeRef.current);
      }
      if (groupRef.current && sphereRef.current) {
        groupRef.current.remove(sphereRef.current);
      }
    };
  }, [aggregatorClipped, betPosition, visible, isUserBetZero]);

  // ===== Обновление геометрии/позиции объектов =====
  useEffect(() => {
    if (!visible) return;
    if (yellowLineRef.current?.geometry) {
      const geom = yellowLineRef.current.geometry as LineGeometry;
      const positions = [
        0, 0, 0,
        aggregatorClipped.x,
        aggregatorClipped.y,
        1
      ];
      console.log("Задаваемые позиции:", positions);
      geom.setPositions(positions);

    }
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(aggregatorClipped);
      yellowConeRef.current.position.z = 1;
      {
        const desiredDir = new THREE.Vector3(aggregatorClipped.x, aggregatorClipped.y, 1).normalize();
        const defaultDir = new THREE.Vector3(0, 1, 0);
        if (desiredDir.length() > 0) {
          const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
          yellowConeRef.current.setRotationFromQuaternion(quat);
        }
      }
    }
    if (whiteLineRef.current?.geometry && betPosition) {
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        aggregatorClipped.x,
        aggregatorClipped.y,
        1,
        betPosition.x,
        betPosition.y,
        1
      ]);
      geom.computeBoundingSphere?.();
    }
    if (whiteConeRef.current && betPosition) {
      whiteConeRef.current.position.copy(betPosition);
      whiteConeRef.current.position.z = 1;
      {
        // При создании белого конуса:
        const defaultDir = new THREE.Vector3(0, 1, 0);
        const desiredDir = isUserBetZero
          ? new THREE.Vector3(betPosition.x, betPosition.y, 1).normalize()
          : betPosition.clone().sub(aggregatorClipped).normalize();
        if (desiredDir.length() > 0) {
          const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
          whiteConeRef.current?.setRotationFromQuaternion(quat);
        }
      }
    }
    if (sphereRef.current && betPosition) {
      sphereRef.current.position.copy(betPosition);
      sphereRef.current.position.z = 1;
    }
  }, [aggregatorClipped, betPosition, isUserBetZero, visible]);

  // ===== Настройка фиксированной плоскости (z = 1) =====
  useEffect(() => {
    plane.current.copy(new THREE.Plane(new THREE.Vector3(0, 0, 1), -1));
    console.log("[BetLines] Установлена фиксированная плоскость: z = 1");
  }, []);

  // ===== Drag-логика =====
  const isClickOnSphere = useCallback((evt: PointerEvent) => {
    console.log("[BetLines] isClickOnSphere: pointer event", evt.clientX, evt.clientY);
    if (!sphereRef.current) return false;
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((evt.clientX - rect.left) / rect.width) * 2 - 1,
      -((evt.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);
    const hits = raycaster.current.intersectObject(sphereRef.current);
    console.log("[BetLines] isClickOnSphere: hits", hits);
    return hits.length > 0;
  }, [camera, gl.domElement]);

  const handlePointerDown = useCallback((evt: PointerEvent) => {
    evt.stopPropagation();
    console.log("[BetLines] handlePointerDown", evt.clientX, evt.clientY);
    if (isClickOnSphere(evt)) {
      console.log("[BetLines] Нажатие на сферу");
      setIsDragging(true);
      onDragging(true);
    }
  }, [isClickOnSphere, onDragging]);

  const handlePointerMove = useCallback((evt: PointerEvent) => {
    if (!isDragging) return;
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((evt.clientX - rect.left) / rect.width) * 2 - 1,
      -((evt.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);

    // Обновляем плоскость на основе текущего направления камеры
    plane.current.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new THREE.Vector3()).clone().negate(),
      aggregatorClipped
    );

    const intersect = new THREE.Vector3();
    const intersectExists = raycaster.current.ray.intersectPlane(plane.current, intersect);
    console.log("[BetLines] intersect", intersectExists, intersect.toArray());
    if (!intersectExists) {
      console.log("[BetLines] Нет пересечения с плоскостью");
      return;
    }

    // Вычисляем новое положение: direction = intersect - aggregatorClipped
    const direction = intersect.clone().sub(aggregatorClipped);
    let newPos = betPosition ? betPosition.clone() : new THREE.Vector3();

    if (axisMode === "X") {
      newPos.x = aggregatorClipped.x + direction.x;
    } else if (axisMode === "Y") {
      newPos.y = aggregatorClipped.y + direction.y;
    } else {
      newPos = aggregatorClipped.clone().add(direction);
    }

    // Ограничиваем длину вектора, если он больше maxWhiteLength
    const finalDir = newPos.clone().sub(aggregatorClipped);
    if (finalDir.length() > maxWhiteLength) {
      finalDir.setLength(maxWhiteLength);
      newPos = aggregatorClipped.clone().add(finalDir);
    }

    console.log("[BetLines] Новая позиция для ставки:", newPos.toArray());
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
    console.log("[BetLines] handlePointerUp");
    if (!isDragging) return;
    console.log("[BetLines] handlePointerUp");
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

  // Добавляем глобальные слушатели событий указателя
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

  // Если visible === false, ничего не рендерим
  if (!visible) return null;
  // Рендерим группу, в которую добавляются все объекты
  return <group ref={groupRef} />;
};

export default BetLines;
