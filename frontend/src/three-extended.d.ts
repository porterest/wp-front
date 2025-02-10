// three-extended.d.ts
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { Object3DNode, BufferGeometryNode, MaterialNode } from "@react-three/fiber";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      line2: Object3DNode<Line2, typeof Line2>;
      lineGeometry: BufferGeometryNode<LineGeometry, typeof LineGeometry>;
      lineMaterial: MaterialNode<LineMaterial, typeof LineMaterial>;
    }
  }
}
