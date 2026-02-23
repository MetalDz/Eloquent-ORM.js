/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/lab_test/**/*.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  clearMocks: true,
};

