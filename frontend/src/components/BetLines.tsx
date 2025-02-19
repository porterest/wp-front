// Импортируем необходимые модули из React и хуки для работы с состоянием и эффектами
import React, {
  useCallback,    // Хук для мемоизации функций-обработчиков
  useEffect,      // Хук для выполнения побочных эффектов
  useMemo,        // Хук для мемоизации вычислений
  useRef,         // Хук для создания ссылок на DOM-элементы и объекты
  useState,       // Хук для создания локального состояния
} from "react";
// Импортируем хук useThree из библиотеки @react-three/fiber для доступа к объектам Three.js
import { useThree } from "@react-three/fiber";
// Импортируем всю библиотеку three.js под именем THREE
import * as THREE from "three";
// Импортируем функцию получения баланса пользователя с сервера
import { fetchUserBalances } from "../services/api";
// Импортируем Line2 для отрисовки линий с расширенными возможностями (из примеров three.js)
import { Line2 } from "three/examples/jsm/lines/Line2";
// Импортируем материал для линий
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
// Импортируем геометрию для линий
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
// Импортируем хук useScale из контекста для масштабирования координат
import { useScale } from "../context/ScaleContext";

// Определяем интерфейс пропсов компонента BetLines
interface BetLinesProps {
  previousBetEnd: THREE.Vector3;   // Точка окончания предыдущего агрегатора (формат: { x: транзакции, y: цена, z: время })
  userPreviousBet: THREE.Vector3;    // Вектор предыдущей ставки пользователя (формат: { x: транзакции, y: цена, z: время })
  onDragging: (isDragging: boolean) => void; // Функция обратного вызова, уведомляющая о начале/окончании перетаскивания
  onShowConfirmButton: (              // Функция для отображения кнопки подтверждения ставки, принимает флаг и опциональные данные
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number; // Максимальная длина желтого вектора (агрегатора)
  maxWhiteLength: number;  // Максимальная длина белого вектора (ставки)
  handleDrag: (newPosition: THREE.Vector3) => void; // Функция обратного вызова при изменении позиции перетаскивания
  setBetAmount: (newAmount: number) => void;        // Функция для установки суммы ставки
  axisMode: "X" | "Y"; // Режим, по которому осуществляется перетаскивание (только X или только Y)
  visible: boolean;    // Флаг видимости компонента (если false – компонент не отрисовывается)
}

const LOCAL_KEY = "userBetVector"; // Ключ для сохранения/получения вектора ставки из localStorage

// Функция проверки, является ли вектор нулевым (с учетом эпсилон для погрешностей)
const isVectorZero = (vec: THREE.Vector3, eps = 0.000001): boolean =>
  Math.abs(vec.x) < eps && Math.abs(vec.y) < eps && Math.abs(vec.z) < eps;

// Основной функциональный компонент BetLines
const BetLines: React.FC<BetLinesProps> = ({
                                             previousBetEnd,       // Получаем точку окончания предыдущего агрегатора
                                             userPreviousBet,      // Получаем вектор предыдущей ставки пользователя
                                             onDragging,           // Функция для уведомления о начале/конце перетаскивания
                                             onShowConfirmButton,  // Функция для отображения кнопки подтверждения
                                             maxYellowLength,      // Максимальная длина желтого вектора
                                             maxWhiteLength,       // Максимальная длина белого вектора
                                             handleDrag,           // Функция для обработки изменения позиции перетаскивания
                                             setBetAmount,         // Функция для установки суммы ставки
                                             axisMode,             // Режим перетаскивания по оси (X или Y)
                                             visible,              // Флаг видимости компонента
                                           }) => {
  // Получаем объект рендерера (gl) и камеру из контекста Three.js
  const { gl, camera } = useThree();
  // Создаем ссылку (ref) для группы объектов, которая будет содержать все элементы вектора
  const groupRef = useRef<THREE.Group>(null);
  // Создаем ref для raycaster, который используется для определения пересечений луча с объектами
  const raycaster = useRef(new THREE.Raycaster());
  // Создаем ref для плоскости, которая используется для вычисления точки пересечения при перетаскивании
  const plane = useRef(new THREE.Plane());

  // Создаем ref для желтой линии (агрегатора)
  const yellowLineRef = useRef<Line2 | null>(null);
  // Создаем ref для желтого конуса (указатель конца желтого вектора)
  const yellowConeRef = useRef<THREE.Mesh | null>(null);
  // Создаем ref для белой линии (ставки)
  const whiteLineRef = useRef<Line2 | null>(null);
  // Создаем ref для белого конуса (указатель конца белой стрелки)
  const whiteConeRef = useRef<THREE.Mesh | null>(null);
  // Создаем ref для сферы, используемой для перетаскивания белой стрелки
  const sphereRef = useRef<THREE.Mesh | null>(null);

  // Из контекста получаем функции нормализации координат:
  // normalizeZ используется для нормализации значения по оси X,
  // normalizeY – для нормализации значения по оси Y.
  const { normalizeY, normalizeZ } = useScale();

  // Создаем локальное состояние для отслеживания, происходит ли перетаскивание (dragging)
  const [isDragging, setIsDragging] = useState(false);
  // Создаем локальное состояние для хранения баланса пользователя
  const [userBalance, setUserBalance] = useState(0);
  // useEffect для получения баланса пользователя при монтировании компонента
  useEffect(() => {
    (async () => {
      try {
        // Запрашиваем баланс с сервера
        const { balance } = await fetchUserBalances();
        setUserBalance(balance); // Устанавливаем баланс в состояние
        console.log("[BetLines] userBalance:", balance);
      } catch (err) {
        console.error("[BetLines] Failed to fetch user balances:", err);
      }
    })();
  }, []);

  // --- Вычисление жёлтого вектора (агрегатора) ---
  // Используем useMemo для вычисления агрегатора, чтобы не пересчитывать при каждом рендере,
  // если входные данные не изменились.
  const aggregatorClipped = useMemo(() => {
    // Нормализуем x координату, используя функцию normalizeZ
    const normX = normalizeZ(previousBetEnd.x);
    // Нормализуем y координату, используя функцию normalizeY
    const normY = normalizeY(previousBetEnd.y);
    // Создаем 2D-вектор из нормализованных координат
    const vec2 = new THREE.Vector2(normX, normY);
    // Ограничиваем длину 2D-вектора до maxYellowLength, если она превышает заданное значение
    vec2.clampLength(0, maxYellowLength);
    // Возвращаем 3D-вектор, собранный из полученных координат, с фиксированным значением z = 1
    return new THREE.Vector3(vec2.x, vec2.y, 1);
  }, [previousBetEnd, maxYellowLength, normalizeZ, normalizeY]);

  // Используем useMemo для определения, является ли userPreviousBet нулевым вектором (0,0,0)
  const isUserBetZero = useMemo(
    () =>
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 0,
    [userPreviousBet],
  );

  // --- Инициализация белого вектора (betPosition) ---
  // Вычисляем белый вектор, который представляет ставку. Его начало совпадает с концом агрегатора,
  // а значение z фиксировано равно 2.
  const computedBetPosition = useMemo(() => {
    try {
      // Пытаемся получить сохранённый вектор из localStorage
      const stored = localStorage.getItem(LOCAL_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        // Если в LS хранится массив с минимум 3 элементами, создаем вектор из этих данных
        if (Array.isArray(arr) && arr.length >= 3) {
          return new THREE.Vector3(arr[0], arr[1], 2);
        }
      }
    } catch (err) {
      console.error("[BetLines] Ошибка парсинга LS:", err);
    }

    // Если пользовательский вектор равен нулю, используем минимальное смещение от агрегатора
    if (isUserBetZero) {
      const minDelta = 0.0001; // Минимальное смещение
      let baseVector = aggregatorClipped.clone(); // Базовый вектор – агрегатор
      // Если базовый вектор тоже равен нулю, используем запасной вектор (3,3,1)
      if (isVectorZero(baseVector)) {
        baseVector = new THREE.Vector3(3, 3, 1);
      }
      const direction = baseVector.clone().normalize(); // Вычисляем нормализованное направление
      if (direction.length() === 0) {
        direction.set(1, 0, 0); // Если направление нулевое, устанавливаем его по оси X
      }
      const offset = direction.multiplyScalar(minDelta); // Вычисляем смещение в заданном направлении
      return baseVector.add(offset).setZ(2); // Возвращаем итоговый вектор со смещением, устанавливая z = 2
    }

    // Если пользовательский вектор не равен нулю:
    // Вычисляем разницу (дельту) между userPreviousBet и агрегатором.
    const deltaX = normalizeZ(userPreviousBet.x - aggregatorClipped.x); // Нормализуем разницу по оси X
    const deltaY = normalizeY(userPreviousBet.y - aggregatorClipped.y); // Нормализуем разницу по оси Y
    const deltaZ = userPreviousBet.z - aggregatorClipped.z; // Разница по оси Z оставляется без нормализации
    const delta = new THREE.Vector3(deltaX, deltaY, deltaZ); // Собираем дельту в вектор

    console.log("userPreviousBet.x, userPreviousBet.y, userPreviousBet.z");
    console.log(userPreviousBet.x, userPreviousBet.y, userPreviousBet.z);
    // Ограничиваем длину дельты до maxWhiteLength, если она превышает заданное значение
    delta.clampLength(0, maxWhiteLength);


    console.log("aggregatorClipped.clone().add(delta).setZ(2).x, aggregatorClipped.clone().add(delta).setZ(2).y,",
      "aggregatorClipped.clone().add(delta).setZ(2).z");
    // Итоговый белый вектор – это агрегатор + ограниченная дельта, при этом значение z фиксировано равно 2
    console.log(aggregatorClipped.clone().add(delta).setZ(2).x, aggregatorClipped.clone().add(delta).setZ(2).y,
      aggregatorClipped.clone().add(delta).setZ(2).z);


    return aggregatorClipped.clone().add(delta).setZ(2);
  }, [aggregatorClipped, userPreviousBet, isUserBetZero, maxWhiteLength, normalizeZ, normalizeY]);

  // Создаем состояние betPosition для хранения текущего белого вектора (ставки)
  const [betPosition, setBetPosition] = useState<THREE.Vector3 | null>(computedBetPosition);

  // При изменении computedBetPosition обновляем состояние betPosition
  useEffect(() => {
    if (isDragging) return; // не обновляем, если сейчас происходит перетаскивание
    setBetPosition(computedBetPosition);
  }, [computedBetPosition, isDragging]);


  // Этот useEffect обновляет betPosition, если изменяется userPreviousBet (и LS не используется)
  // useEffect(() => {
  //   console.log("[BetLines] userPreviousBet изменился:", userPreviousBet.toArray());
  //   const stored = localStorage.getItem(LOCAL_KEY);
  //   if (stored) {
  //     console.log("[BetLines] LS присутствует – не обновляем betPosition");
  //     return;
  //   }
  //   // Если userPreviousBet равен (0,0,1), устанавливаем betPosition как агрегатор со смещением
  //   if (
  //     userPreviousBet.x === 0 &&
  //     userPreviousBet.y === 0 &&
  //     userPreviousBet.z === 1
  //   ) {
  //     console.log("[BetLines] userPreviousBet равен (0,0,1) – устанавливаем betPosition как aggregatorClipped + смещение");
  //     if (axisMode === "X") {
  //       setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0.001, 0, 0)).setZ(2));
  //     } else if (axisMode === "Y") {
  //       setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0, 0.001, 0)).setZ(2));
  //     } else {
  //       setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0.001, 0.001, 0)).setZ(2));
  //     }
  //     return;
  //   }
  //   // Вычисляем смещение от userPreviousBet до агрегатора
  //   const offset = userPreviousBet.clone().sub(aggregatorClipped);
  //   // Если смещение больше maxWhiteLength, ограничиваем его
  //   if (offset.length() > maxWhiteLength) {
  //     offset.setLength(maxWhiteLength);
  //     userPreviousBet.copy(aggregatorClipped).add(offset);
  //   }
  //   // Устанавливаем обновлённый белый вектор, фиксируя z = 2
  //   setBetPosition(userPreviousBet.clone().setZ(2));
  // }, [userPreviousBet, aggregatorClipped, maxWhiteLength, axisMode, isDragging]);

  // --- Функция для получения "сырых" нормализованных координат ---
  // Функция getRawVector принимает вектор и возвращает новый вектор, где:
  // - x нормализуется через normalizeZ,
  // - y нормализуется через normalizeY,
  // - z остается без изменений.
  const getRawVector = (vec: THREE.Vector3): THREE.Vector3 => {
    return new THREE.Vector3(
      normalizeZ(vec.x), // Нормализуем значение x
      normalizeY(vec.y), // Нормализуем значение y
      vec.z              // Значение z оставляем неизменным
    );
  };

  // --- Вычисляем итоговый жёлтый вектор (агрегатор) для отрисовки ---
  // Получаем "сырые" нормализованные координаты агрегатора и масштабируем их,
  // умножая на 0.4 (так как нормализация возвращает значения от 0 до 5, 0.4*5 = 2, то итоговый диапазон будет 0–2.5)
  const rawYellow = getRawVector(aggregatorClipped);
  const yellowFinal = rawYellow.clone().multiplyScalar(0.4);
  // Фиксируем z для желтого вектора равным 1
  yellowFinal.z = 1;

  // --- Вычисляем итоговый белый вектор (ставки) для отрисовки ---
  // Если betPosition существует, вычисляем "сырые" нормализованные координаты белого вектора,
  // затем вычисляем дельту между белым вектором и rawYellow, масштабируем ее на 0.4 и прибавляем к yellowFinal.
  const whiteFinal = betPosition
    ? yellowFinal
      .clone()
      .add(getRawVector(betPosition).sub(rawYellow).multiplyScalar(0.4))
    : null;
  if (whiteFinal) whiteFinal.z = 2; // Фиксируем z для белого вектора равным 2

  // ----- Отрисовка жёлтого вектора (агрегатора) -----
  // Этот useEffect создает объекты для отрисовки желтого вектора и добавляет их в группу
  useEffect(() => {
    // Если компонент не виден или агрегатор равен нулю, выходим из эффекта
    if (!visible || isVectorZero(aggregatorClipped)) return;
    if (!groupRef.current) return;
    console.log("[BetLines] yellowFinal:", yellowFinal.toArray());
    // Создаем геометрию для желтой линии, начинающуюся в (0,0,0) и заканчивающуюся в yellowFinal
    const yGeom = new LineGeometry();
    yGeom.setPositions([0, 0, 0, yellowFinal.x, yellowFinal.y, yellowFinal.z]);

    // Создаем материал для желтой линии с заданным цветом, толщиной и разрешением
    const yMat = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    // Создаем линию с использованием геометрии и материала
    const yLine = new Line2(yGeom, yMat);
    console.log("[BetLines] yellowFinal:", yellowFinal.toArray());
    yellowLineRef.current = yLine; // Сохраняем ссылку на желтую линию
    groupRef.current.add(yLine);   // Добавляем желтую линию в группу

    // Создаем желтый конус для указания конца желтого вектора
    const yCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12), // Геометрия конуса
      new THREE.MeshStandardMaterial({ color: "yellow" }) // Материал конуса
    );
    yCone.position.copy(yellowFinal); // Устанавливаем позицию конуса в конце желтой линии
    yCone.position.z = 1; // Фиксируем z конуса равным 1
    {
      // Вычисляем направление, в котором должен смотреть конус
      const desiredDir = new THREE.Vector3(yellowFinal.x, yellowFinal.y, yellowFinal.z).normalize();
      const defaultDir = new THREE.Vector3(0, 1, 0); // Базовое направление по оси Y
      if (desiredDir.length() > 0) {
        // Вычисляем кватернион для поворота defaultDir в desiredDir
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        yCone.setRotationFromQuaternion(quat); // Применяем поворот к конусу
      }
    }
    yellowConeRef.current = yCone; // Сохраняем ссылку на желтый конус
    groupRef.current.add(yCone);   // Добавляем желтый конус в группу

    // Функция очистки эффекта: при размонтировании удаляем созданные объекты из группы
    return () => {
      if (groupRef.current && yellowLineRef.current) {
        groupRef.current.remove(yellowLineRef.current);
      }
      if (groupRef.current && yellowConeRef.current) {
        groupRef.current.remove(yellowConeRef.current);
      }
    };
  }, [aggregatorClipped, visible, yellowFinal]);

  // ----- Отрисовка белой стрелки (ставки) -----
  // Этот useEffect создает объекты для отрисовки белой стрелки (ставки) и добавляет их в группу
  useEffect(() => {
    if (!visible) return; // Если компонент не виден, ничего не делаем
    if (!groupRef.current) return; // Если группа не создана, выходим
    if (!betPosition || !whiteFinal) {
      // Если белый вектор не задан, удаляем ранее созданные белые объекты
      console.log("[BetLines] Нет betPosition – удаляем белые объекты");
      if (groupRef.current && whiteLineRef.current)
        groupRef.current.remove(whiteLineRef.current);
      if (groupRef.current && whiteConeRef.current)
        groupRef.current.remove(whiteConeRef.current);
      if (groupRef.current && sphereRef.current)
        groupRef.current.remove(sphereRef.current);
      whiteLineRef.current = null;
      whiteConeRef.current = null;
      sphereRef.current = null;
      return;
    } else {
      console.log("[BetLines] Есть и агрегатор, и betPosition:", betPosition.toArray());
    }
    console.log("[BetLines] whiteFinal:", whiteFinal.toArray());
    // Создаем геометрию для белой линии от yellowFinal до whiteFinal
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      yellowFinal.x,
      yellowFinal.y,
      yellowFinal.z,
      whiteFinal.x,
      whiteFinal.y,
      whiteFinal.z,
    ]);
    console.log("[BetLines] whiteFinal:", whiteFinal.toArray());
    // Создаем материал для белой линии
    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    // Создаем белую линию
    const wLine = new Line2(wGeom, wMat);
    whiteLineRef.current = wLine; // Сохраняем ссылку на белую линию
    groupRef.current.add(wLine);    // Добавляем белую линию в группу

    // Создаем белый конус для указания конца белой стрелки
    const wCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12), // Геометрия конуса
      new THREE.MeshStandardMaterial({ color: "white" }) // Материал конуса
    );
    wCone.position.copy(whiteFinal); // Устанавливаем позицию конуса в конце белой линии
    wCone.position.z = 2; // Фиксируем z конуса равным 2
    {
      // Определяем базовое направление по оси Y
      const defaultDir = new THREE.Vector3(0, 1, 0);
      let desiredDir: THREE.Vector3;
      // Если пользовательский вектор равен нулю, вычисляем направление по betPosition
      if (isVectorZero(userPreviousBet)) {
        desiredDir = new THREE.Vector3(betPosition.x, betPosition.y, 2).normalize();
      } else {
        // Иначе, направление определяется как разница между betPosition и агрегатором
        desiredDir = betPosition.clone().sub(aggregatorClipped).normalize();
      }
      if (desiredDir.length() > 0) {
        // Вычисляем кватернион для поворота defaultDir в desiredDir
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        wCone.setRotationFromQuaternion(quat); // Применяем поворот к белому конусу
      }
    }
    whiteConeRef.current = wCone; // Сохраняем ссылку на белый конус
    groupRef.current.add(wCone);    // Добавляем белый конус в группу

    // Создаем сферу для перетаскивания белой стрелки
    const sph = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16), // Геометрия сферы
      new THREE.MeshStandardMaterial({
        color: "blue",
        opacity: 0.5,
        transparent: true,
      }), // Материал сферы с прозрачностью
    );
    sph.position.copy(whiteFinal); // Устанавливаем позицию сферы в конце белой линии
    groupRef.current.add(sph); // Добавляем сферу в группу
    sphereRef.current = sph;   // Сохраняем ссылку на сферу

    // Функция очистки эффекта: удаляем белые объекты из группы при размонтировании эффекта
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
  }, [aggregatorClipped, betPosition, visible, whiteFinal, isVectorZero, userPreviousBet]);

  // ----- Обновление геометрии/позиций объектов (при изменениях) -----
  // Этот useEffect обновляет позиции и ориентацию объектов (линий, конусов, сферы)
  useEffect(() => {
    if (!visible) return; // Если компонент не виден, ничего не делаем
    // Нормализуем агрегатор для отрисовки: применяем нормализацию и масштабируем (0.5) для получения диапазона 0–2.5
    const normalizedAggregator = new THREE.Vector3(
      normalizeZ(aggregatorClipped.x),
      normalizeY(aggregatorClipped.y),
      aggregatorClipped.z,
    ).multiplyScalar(0.4);
    normalizedAggregator.z = 1; // Фиксируем z агрегатора равным 1
    // Нормализуем позицию белого вектора для отрисовки: если betPosition существует, преобразуем его
    const normalizedBetPosition = betPosition
      ? new THREE.Vector3(
        normalizeZ(betPosition.x),
        normalizeY(betPosition.y),
        2,
      )
      : null;
    console.log("[BetLines] обновление: normalizedAggregator", normalizedAggregator.toArray());
    console.log("[BetLines] обновление: normalizedBetPosition", normalizedBetPosition?.toArray());
    // Если существует желтая линия, обновляем её позиции
    if (yellowLineRef.current && yellowLineRef.current.geometry instanceof LineGeometry) {
      const positions = [
        0,
        0,
        0,
        normalizedAggregator.x,
        // normalizedAggregator.x,
        normalizedAggregator.y,
        1
        // normalizedAggregator.z,
      ];
      yellowLineRef.current.geometry.setPositions(positions);
    }
    // Обновляем позицию и ориентацию желтого конуса
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(normalizedAggregator);
      yellowConeRef.current.position.z = normalizedAggregator.z;
      const desiredDir = new THREE.Vector3(
        normalizedAggregator.x,
        normalizedAggregator.y,
        normalizedAggregator.z,
      ).normalize();
      const defaultDir = new THREE.Vector3(0, 1, 0);
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    // Если существует белая линия и позиция белого вектора определена, обновляем её позиции
    if (
      whiteLineRef.current &&
      whiteLineRef.current.geometry instanceof LineGeometry &&
      normalizedBetPosition
    ) {
      const positions = [
        normalizedAggregator.x,
        normalizedAggregator.y,
        normalizedAggregator.z,
        normalizedBetPosition.x,
        normalizedBetPosition.y,
        normalizedBetPosition.z,
      ];
      whiteLineRef.current.geometry.setPositions(positions);
    }
    // Обновляем позицию и ориентацию белого конуса
    if (whiteConeRef.current && normalizedBetPosition) {
      whiteConeRef.current.position.copy(normalizedBetPosition);
      whiteConeRef.current.position.z = normalizedBetPosition.z;
      const defaultDir = new THREE.Vector3(0, 1, 0);
      const desiredDir = isVectorZero(userPreviousBet)
        ? normalizedBetPosition.clone().normalize()
        : normalizedBetPosition.clone().sub(normalizedAggregator).normalize();
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        whiteConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    // Обновляем позицию сферы
    if (sphereRef.current && normalizedBetPosition) {
      sphereRef.current.position.copy(normalizedBetPosition);
      sphereRef.current.position.z = normalizedBetPosition.z;
    }
  }, [aggregatorClipped, betPosition, visible]);

  // ----- Логика перетаскивания -----
  // Функция для проверки, был ли клик выполнен по сфере (используется raycaster)
  const isClickOnSphere = useCallback(
    (evt: PointerEvent) => {
      console.log("[BetLines] isClickOnSphere: pointer event", evt.clientX, evt.clientY);
      if (!sphereRef.current) return false; // Если сферы нет, возвращаем false
      const rect = gl.domElement.getBoundingClientRect(); // Получаем размеры канваса
      // Вычисляем координаты указателя в нормализованных координатах устройства (NDC)
      const mouse = new THREE.Vector2(
        ((evt.clientX - rect.left) / rect.width) * 2 - 1,
        -((evt.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(mouse, camera); // Устанавливаем луч от камеры
      const hits = raycaster.current.intersectObject(sphereRef.current); // Получаем объекты, с которыми пересекается луч
      console.log("[BetLines] isClickOnSphere: hits", hits);
      return hits.length > 0; // Если пересечений больше 0, возвращаем true
    },
    [camera, gl.domElement],
  );

  // Обработчик события pointerdown (нажатие указателя)
  const handlePointerDown = useCallback(
    (evt: PointerEvent) => {
      evt.stopPropagation(); // Останавливаем всплытие события
      console.log("[BetLines] handlePointerDown", evt.clientX, evt.clientY);
      if (isClickOnSphere(evt)) { // Если клик был по сфере
        console.log("[BetLines] Нажатие на сферу");
        setIsDragging(true); // Устанавливаем состояние перетаскивания в true
        onDragging(true);    // Вызываем функцию обратного вызова для уведомления родителя
      }
    },
    [isClickOnSphere, onDragging],
  );

  // Обработчик события pointermove (движение указателя)
  const handlePointerMove = useCallback(
    (evt: PointerEvent) => {
      if (!isDragging) return; // Если не перетаскиваем, выходим
      const rect = gl.domElement.getBoundingClientRect(); // Получаем размеры канваса
      // Вычисляем координаты указателя в нормализованных координатах устройства (NDC)
      const mouse = new THREE.Vector2(
        ((evt.clientX - rect.left) / rect.width) * 2 - 1,
        -((evt.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(mouse, camera); // Устанавливаем луч от камеры
      // Определяем плоскость для перетаскивания: плоскость с нормалью, направленной от камеры, проходящая через агрегатор
      plane.current.setFromNormalAndCoplanarPoint(
        camera.getWorldDirection(new THREE.Vector3()).clone().negate(),
        aggregatorClipped
      );
      const intersect = new THREE.Vector3();
      // Вычисляем точку пересечения луча с плоскостью
      const intersectExists = raycaster.current.ray.intersectPlane(
        plane.current,
        intersect,
      );
      console.log("[BetLines] intersect", intersectExists, intersect.toArray());
      if (!intersectExists) {
        console.log("[BetLines] Нет пересечения с плоскостью");
        return;
      }
      // Вычисляем вектор направления от агрегатора до точки пересечения
      const direction = intersect.clone().sub(aggregatorClipped);
      // Копируем текущую позицию белого вектора или создаем новый вектор, если он не задан
      let newPos = betPosition ? betPosition.clone() : new THREE.Vector3();
      if (axisMode === "X") {
        // Если выбран режим по оси X, изменяем только координату x
        newPos.x = aggregatorClipped.x + direction.x;
      } else if (axisMode === "Y") {
        // Если выбран режим по оси Y, изменяем только координату y
        newPos.y = aggregatorClipped.y + direction.y;
      } else {
        // Если режим не ограничен, новая позиция равна агрегатору плюс направление
        newPos = aggregatorClipped.clone().add(direction);
      }
      // Ограничиваем длину белой стрелки до максимальной (maxWhiteLength)
      const finalDir = newPos.clone().sub(aggregatorClipped);
      if (finalDir.length() > maxWhiteLength) {
        finalDir.setLength(maxWhiteLength);
        newPos = aggregatorClipped.clone().add(finalDir);
      }
      console.log("[BetLines] Новая позиция для ставки:", newPos.toArray());
      setBetPosition(newPos); // Обновляем состояние betPosition
      const fraction = finalDir.length() / maxWhiteLength; // Вычисляем отношение длины дельты к максимальной длине
      setBetAmount(userBalance * fraction); // Вычисляем сумму ставки пропорционально длине стрелки
      handleDrag(newPos); // Вызываем функцию обратного вызова для обработки перетаскивания
    },
    [
      isDragging,
      aggregatorClipped,
      betPosition,
      axisMode,
      camera,
      gl.domElement,
      maxWhiteLength,
      userBalance,
      handleDrag,
      setBetAmount,
    ],
  );

  // Обработчик события pointerup (отпускание указателя)
  const handlePointerUp = useCallback(() => {
    console.log("[BetLines] handlePointerUp");
    if (!isDragging) return;
    setIsDragging(false); // Сбрасываем состояние перетаскивания
    onDragging(false);    // Уведомляем родительский компонент о завершении перетаскивания
    // Вычисляем конечную дельту между текущей позицией betPosition и агрегатором
    const finalDir = betPosition ? betPosition.clone().sub(aggregatorClipped) : new THREE.Vector3();
    // Вычисляем отношение длины дельты к maxWhiteLength (ограничено до 1)
    const fraction = Math.min(finalDir.length() / maxWhiteLength, 1);
    const betAmt = fraction * userBalance; // Вычисляем сумму ставки
    setBetAmount(betAmt); // Обновляем сумму ставки
    // Вызываем функцию для отображения кнопки подтверждения с данными ставки
    onShowConfirmButton(true, {
      amount: betAmt,
      predicted_vector: betPosition ? [betPosition.x, betPosition.y, betPosition.z] : [0, 0, 0],
    });
  }, [
    isDragging,
    aggregatorClipped,
    betPosition,
    maxWhiteLength,
    userBalance,
    onDragging,
    onShowConfirmButton,
    setBetAmount,
  ]);

  // useEffect для добавления обработчиков событий (pointerdown, pointermove, pointerup) на канвасе
  useEffect(() => {
    const c = gl.domElement; // Получаем DOM-элемент канваса
    c.addEventListener("pointerdown", handlePointerDown); // Добавляем обработчик для нажатия указателя
    c.addEventListener("pointermove", handlePointerMove); // Добавляем обработчик для движения указателя
    c.addEventListener("pointerup", handlePointerUp);     // Добавляем обработчик для отпускания указателя
    // Функция очистки: удаляем обработчики при размонтировании компонента
    return () => {
      c.removeEventListener("pointerdown", handlePointerDown);
      c.removeEventListener("pointermove", handlePointerMove);
      c.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gl.domElement, handlePointerDown, handlePointerMove, handlePointerUp]);

  // Если компонент не виден, возвращаем null (не отрисовываем ничего)
  if (!visible) return null;
  // Возвращаем группу объектов, содержащую все элементы вектора, с привязанным ref
  return <group ref={groupRef} />;
};

// Экспортируем компонент BetLines для использования в других частях приложения
export default BetLines;
