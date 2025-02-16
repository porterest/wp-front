import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { fetchUserBalances } from "../services/api";
import { Line } from "three";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;   // Yellow arrow (aggregator) from backend
  userPreviousBet: THREE.Vector3;    // White arrow (user’s previous bet); if (0,0,0) then pair not selected
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

// Function to check if a vector is zero (with an epsilon)
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
  // Create a group that will be added to the scene via JSX
  const groupRef = useRef<THREE.Group>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // References to created objects
  const yellowLineRef = useRef<Line | null>(null);
  const yellowConeRef = useRef<THREE.Mesh | null>(null);
  const whiteLineRef = useRef<Line | null>(null);
  const whiteConeRef = useRef<THREE.Mesh | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  // We swap the X and Y values here once so that:
  // display.x = previousBetEnd.y, display.y = previousBetEnd.x, display.z remains as previousBetEnd.z.
  const [aggregatorClipped, setAggregatorClipped] = useState<THREE.Vector3>(new THREE.Vector3());

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  // User balance
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

  // Normalize the aggregator vector
  useEffect(() => {
    console.log("previousBetEnd changed:", previousBetEnd);
    // Swap X and Y here: using previousBetEnd.y for our internal X, and previousBetEnd.x for our internal Y.
    const xy = new THREE.Vector2(previousBetEnd.y, previousBetEnd.x);
    if (xy.length() > maxYellowLength) {
      xy.setLength(maxYellowLength);
    }
    // Use the swapped values and keep the original z
    const position = new THREE.Vector3(xy.x, xy.y, previousBetEnd.z);
    setAggregatorClipped(position);
    console.log("aggregatorClipped:", position.toArray());
  }, [previousBetEnd, maxYellowLength]);

  // Flag: whether userPreviousBet is (0,0,0)
  const isUserBetZero = useMemo(
    () =>
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 0,
    [userPreviousBet]
  );

  // Initialize white vector (betPosition)
  const [betPosition, setBetPosition] = useState<THREE.Vector3 | null>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length >= 3) {
          return new THREE.Vector3(arr[0], arr[1], arr[2]); // use stored z if any
        }
      }
    } catch (err) {
      console.error("[BetLines] Error parsing LS:", err);
    }
    if (isUserBetZero) {
      const minDelta = 0.0001;
      let baseVector = aggregatorClipped.clone();
      if (isVectorZero(baseVector)) {
        baseVector = new THREE.Vector3(3, 3, 1);
      }
      const direction = baseVector.clone().normalize();
      if (direction.length() === 0) {
        direction.set(1, 0, 0);
      }
      const offset = direction.multiplyScalar(minDelta);
      return baseVector.add(offset).setZ(aggregatorClipped.z); // preserve z from aggregatorClipped
    }
    const dir = userPreviousBet.clone().sub(aggregatorClipped);
    if (dir.length() > maxWhiteLength) {
      dir.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(dir);
    }
    return userPreviousBet.clone();
  });

  // Update betPosition when userPreviousBet changes
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored) return;
    if (
      userPreviousBet.x === 0 &&
      userPreviousBet.y === 0 &&
      userPreviousBet.z === 1
    ) {
      if (axisMode === "X") {
        setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0.001, 0, 0)).setZ(aggregatorClipped.z));
      } else if (axisMode === "Y") {
        setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0, 0.001, 0)).setZ(aggregatorClipped.z));
      } else {
        setBetPosition(aggregatorClipped.clone().add(new THREE.Vector3(0.001, 0.001, 0)).setZ(aggregatorClipped.z));
      }
      return;
    }
    const offset = userPreviousBet.clone().sub(aggregatorClipped);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      userPreviousBet.copy(aggregatorClipped).add(offset);
    }
    setBetPosition(userPreviousBet.clone());
  }, [userPreviousBet, aggregatorClipped, maxWhiteLength, axisMode, isDragging]);

  // Create yellow objects
  useEffect(() => {
    if (!visible || isVectorZero(aggregatorClipped)) return;
    if (!groupRef.current) return;
    // Create yellow line using the swapped aggregatorClipped values consistently:
    const yellowGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, aggregatorClipped.z),
      new THREE.Vector3(aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z)
    ]);
    const yellowMaterial = new THREE.LineBasicMaterial({ color: "yellow", linewidth: 3 });
    const yLine = new THREE.Line(yellowGeometry, yellowMaterial);
    yellowLineRef.current = yLine;
    groupRef.current.add(yLine);

    // Yellow cone at the end of the yellow line
    const yCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "yellow" })
    );
    yCone.position.copy(aggregatorClipped);
    // Optionally force z if needed; here we keep aggregatorClipped.z
    // yCone.position.z = aggregatorClipped.z;
    {
      // Compute desired direction based on aggregatorClipped (no further swapping)
      const desiredDir = new THREE.Vector3(aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z).normalize();
      const defaultDir = new THREE.Vector3(0, 0, 1);
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        yCone.setRotationFromQuaternion(quat);
      }
    }
    yellowConeRef.current = yCone;
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

  // Create white objects
  useEffect(() => {
    if (!visible) return;
    if (!groupRef.current) return;
    if (!betPosition) {
      if (groupRef.current && whiteLineRef.current) groupRef.current.remove(whiteLineRef.current);
      if (groupRef.current && whiteConeRef.current) groupRef.current.remove(whiteConeRef.current);
      if (groupRef.current && sphereRef.current) groupRef.current.remove(sphereRef.current);
      whiteLineRef.current = null;
      whiteConeRef.current = null;
      sphereRef.current = null;
      return;
    }
    // White line from aggregatorClipped to betPosition
    const whiteGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z),
      new THREE.Vector3(betPosition.x, betPosition.y, betPosition.z)
    ]);
    const whiteMaterial = new THREE.LineBasicMaterial({ color: "white", linewidth: 3 });
    const wLine = new THREE.Line(whiteGeometry, whiteMaterial);
    whiteLineRef.current = wLine;
    groupRef.current.add(wLine);

    // White cone at the end of the white line
    const wCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "white" })
    );
    {
      const defaultDir = new THREE.Vector3(0, 1, 0);
      let desiredDir: THREE.Vector3;
      if (isUserBetZero) {
        desiredDir = new THREE.Vector3(betPosition.x, betPosition.y, betPosition.z).normalize();
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

    // Sphere at betPosition
    const sph = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshStandardMaterial({
        color: "blue",
        opacity: 0.5,
        transparent: true
      })
    );
    sph.position.copy(betPosition);
    groupRef.current.add(sph);
    sphereRef.current = sph;

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

  // Update geometry/positions of objects
  useEffect(() => {
    if (!visible) return;
    // Update yellow line
    if (yellowLineRef.current && yellowLineRef.current.geometry instanceof THREE.BufferGeometry) {
      const positions = new Float32Array([
        0, 0, 0,
        aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z
      ]);
      const attr = yellowLineRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
      attr.array.set(positions);
      attr.needsUpdate = true;
      yellowLineRef.current.geometry.computeBoundingSphere();
    }
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(aggregatorClipped);
      const desiredDir = new THREE.Vector3(aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z).normalize();
      const defaultDir = new THREE.Vector3(0, 1, 0);
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    // Update white line
    if (whiteLineRef.current && whiteLineRef.current.geometry instanceof THREE.BufferGeometry && betPosition) {
      const positions = new Float32Array([
        aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z,
        betPosition.x, betPosition.y, betPosition.z
      ]);
      const attr = whiteLineRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
      attr.array.set(positions);
      attr.needsUpdate = true;
      whiteLineRef.current.geometry.computeBoundingSphere();
    }
    if (whiteConeRef.current && betPosition) {
      whiteConeRef.current.position.copy(betPosition);
      const defaultDir = new THREE.Vector3(0, 1, 0);
      const desiredDir = isUserBetZero
        ? new THREE.Vector3(betPosition.x, betPosition.y, betPosition.z).normalize()
        : betPosition.clone().sub(aggregatorClipped).normalize();
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        whiteConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    if (sphereRef.current && betPosition) {
      sphereRef.current.position.copy(betPosition);
    }
  }, [aggregatorClipped, betPosition, isUserBetZero, visible]);

  // Set up a fixed plane using the current camera direction
  useEffect(() => {
    plane.current.copy(new THREE.Plane(new THREE.Vector3(0, 0, 1), -1));
    console.log("[BetLines] Fixed plane: z = 1");
  }, []);

  // ===== Drag logic =====
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
      console.log("[BetLines] Click on sphere");
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

    // Update plane based on current camera direction
    plane.current.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new THREE.Vector3()).clone().negate(),
      aggregatorClipped
    );

    const intersect = new THREE.Vector3();
    const intersectExists = raycaster.current.ray.intersectPlane(plane.current, intersect);
    console.log("[BetLines] intersect", intersectExists, intersect.toArray());
    if (!intersectExists) {
      console.log("[BetLines] No intersection with plane");
      return;
    }

    // Compute new position: direction = intersect - aggregatorClipped
    const direction = intersect.clone().sub(aggregatorClipped);
    let newPos = betPosition ? betPosition.clone() : new THREE.Vector3();

    if (axisMode === "X") {
      newPos.x = aggregatorClipped.x + direction.x;
    } else if (axisMode === "Y") {
      newPos.y = aggregatorClipped.y + direction.y;
    } else {
      newPos = aggregatorClipped.clone().add(direction);
    }

    // Limit vector length if it exceeds maxWhiteLength
    const finalDir = newPos.clone().sub(aggregatorClipped);
    if (finalDir.length() > maxWhiteLength) {
      finalDir.setLength(maxWhiteLength);
      newPos = aggregatorClipped.clone().add(finalDir);
    }

    console.log("[BetLines] New bet position:", newPos.toArray());
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

  // Add global pointer event listeners
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

  // If visible is false, render nothing
  if (!visible) return null;
  // Render the group that holds all objects
  return <group ref={groupRef} />;
};

export default BetLines;
