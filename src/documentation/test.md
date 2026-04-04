{
  "compilerOptions": {
    /* ---------- Base Output ---------- */
    "target": "ES2020",                 // Modern runtime (supports async/await, Map, etc.)
    "lib": ["ES2020"],                  // Core ES2020 types and APIs
    "module": "CommonJS",               // For Node.js compatibility
    "rootDir": "src",
    "outDir": "dist",

    /* ---------- Type Safety ---------- */
    "strict": true,                     // Enable all strict type-checking
    "noImplicitAny": true,
    "noUnusedLocals": false,            // You can toggle these for dev mode
    "noUnusedParameters": false,

    /* ---------- Compatibility ---------- */
    "moduleResolution": "node",
    "esModuleInterop": true,            // Enables `import fs from 'fs'`
    "resolveJsonModule": true,          // Allows importing JSON configs
    "skipLibCheck": true,               // Skip checking .d.ts files

    /* ---------- CLI / Debug ---------- */
    "sourceMap": true,                  // Enables debugging support
    "pretty": true,                     // Human-friendly CLI output
    "forceConsistentCasingInFileNames": true,

    /* ---------- Decorators (Optional for future ORM features) ---------- */
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },

  /* ---------- Paths ---------- */
  "include": [
    "src/**/*.ts"
    // "src/test/testConnection.ts" // can be uncommented for integration testing
  ],
  "exclude": [
    "node_modules",
    "dist",
    "src/test"
  ]
}
