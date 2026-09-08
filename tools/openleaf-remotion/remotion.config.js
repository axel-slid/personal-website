const {Config} = require("@remotion/cli/config");

Config.overrideWebpackConfig((current) => ({
  ...current,
  module: {
    ...current.module,
    rules: [
      {test: /index\.html$/, type: "asset/source"},
      ...(current.module?.rules || []),
    ],
  },
}));
