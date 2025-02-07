import React from "react";
import GradientPlanes from "./GradientPlanes";
import Axes from "./Axes";

const StaticGraphElements: React.FC = React.memo(() => {
  return (
    <>
      <GradientPlanes />
      <Axes />
    </>
  );
});

export default StaticGraphElements;
