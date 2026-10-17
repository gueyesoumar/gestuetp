import { defineConfig } from 'vitest/config'

// Config dédiée aux tests unitaires (logique pure). Environnement node, pas de
// plugins UI : on ne teste que des fonctions pures (pas de rendu React).
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
