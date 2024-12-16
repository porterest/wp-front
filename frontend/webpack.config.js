module.exports = {
  devtool: false,
  module: {
    rules: [
      {
        test: /\.mjs$/,
        resolve: {
          fullySpecified: false,
        },
      },
    ],
  },

  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  ignoreWarnings: [
    {
      module: /@mediapipe\/tasks-vision/,
    },
    (warning) =>
      warning.module?.resource?.includes("node_modules") &&
      warning.details?.includes("source-map"),
  ],
};
