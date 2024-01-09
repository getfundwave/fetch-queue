export default {
  preset: "ts-jest",
  testEnvironment: "node",
  fakeTimers: { enableGlobally: true },
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  moduleNameMapper: { "node-fetch": "<rootDir>/node_modules/node-fetch-jest" },
};
