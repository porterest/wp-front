import React, { useEffect } from "react";
import { useScene } from "./SceneProvider";
import * as THREE from "three";
import { Vector3 } from "three";

interface PairVectorsProps {
  useSelectedPair: () => string | null;
  usePreviousBetEnd: () => Vector3 | null;
  useUserLastBet: () => Vector3 | null;
}

const PairVectors: React.FC<PairVectorsProps> = ({
  useSelectedPair,
  usePreviousBetEnd,
  useUserLastBet,
}) => {
  const scene = useScene();
  const selectedPair = useSelectedPair();

  useEffect(() => {
    const betEnd = usePreviousBetEnd();
    const lastBet = useUserLastBet();
    if (!betEnd || !lastBet) return;
    drawArrow(new THREE.Vector3(0, 0, 0), betEnd, 0xff0000);
    drawArrow(betEnd, lastBet, 0x00ff00);
  }, [selectedPair]);

  const drawArrow = (
    start: THREE.Vector3,
    end: THREE.Vector3,
    color = 0xff0000,
  ) => {
    const arrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3().subVectors(end, start).normalize(),
      start,
      start.distanceTo(end),
      color,
    );
    scene.add(arrowHelper);
  };

  return null;
};

export default PairVectors;
