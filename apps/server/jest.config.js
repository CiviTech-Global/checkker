/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@checkker/(.*)$": "<rootDir>/../../packages/$1/src",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          types: ["node", "jest"],
          module: "CommonJS",
          moduleResolution: "node",
          esModuleInterop: true,
        },
      },
    ],
  },
};
