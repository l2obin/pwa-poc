# React + TypeScript + Vite + PWA + SQLite (via OPFS)

This template provides a minimal setup for a React application using TypeScript, Vite, and Progressive Web App (PWA) features, with SQLite support via the Origin Private File System (OPFS).

## SQLite Database Storage

This application uses SQLite WASM with the `opfs-sahpool` VFS (Virtual File System) to store data in the browser's Origin Private File System (OPFS). The database is persisted locally in the browser and survives page reloads and browser restarts.

### Database Export

The Settings page includes a database export feature that allows you to download a copy of your SQLite database as a `.sqlite3` file.

**How it works:**

The export uses the SQLite WASM worker's `export` command, which serializes the database through the database connection. This approach is used because:

- SQLite WASM uses the `opfs-sahpool` VFS which stores data in a **pooled structure** with multiple internal files, not as a single `.sqlite3` file
- Direct file access via the Storage Manager API (`navigator.storage.getDirectory()`) is not straightforward with this VFS architecture
- The SQLite worker's export command properly handles the internal VFS structure and produces a valid, portable SQLite database file

The exported `.sqlite3` file can be opened with any SQLite-compatible tool (e.g., DB Browser for SQLite, SQLite CLI, etc.).

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
