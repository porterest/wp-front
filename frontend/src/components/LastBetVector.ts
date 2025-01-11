import React, { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PairOption } from "../types/pair";

interface PairVectorsProps {
  selectedPair: PairOption | null;
  previousBetEnd: THREE.Vector3;
}

const LastBetVector: React.FC<PairVectorsProps> = ({
  selectedPair,
  previousBetEnd,
}) => {
  const { scene } = useThree();

  useEffect(() => {
    console.log('selectedPair: ', selectedPair);
    console.log('previousBetEnd: ', previousBetEnd);
    if (!previousBetEnd) return;

    drawArrow(
      new THREE.Vector3(0, 0, 0),
      previousBetEnd,
      0xff0000,
    ); // Red Arrow
    // drawArrow(previousBetEnd, userLastBet, 0x00ff00); // Green Arrow

  }, [selectedPair, previousBetEnd]);

  const drawArrow = (
    start: THREE.Vector3,
    end: THREE.Vector3,
    color: number = 0xff0000,
  ): THREE.ArrowHelper => {
    console.log("Start vector:", start);
    console.log("End vector:", end);
    console.log("Direction:", new THREE.Vector3().subVectors(end, start).normalize());

    const arrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3().subVectors(end, start).normalize(),
      start,
      start.distanceTo(end),
      color,
    );
    scene.add(arrowHelper);
    console.log("Arrow added to scene:", arrowHelper);

    return arrowHelper;
  };

  return null;
};

export default LastBetVector;
