export default {
  preset: "ts-jest",
  testEnvironment: "node",
  fakeTimers: { enableGlobally: true },
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
};
