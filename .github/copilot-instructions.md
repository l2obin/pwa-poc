# PWA-POC: React + TypeScript + Vite + PWA + SQLite (OPFS)

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

This is a Progressive Web App (PWA) built with React 19.1.0, TypeScript, Vite, SQLite WASM with OPFS (Origin Private File System), WebAuthn authentication demo, and Excalidraw diagramming. The app demonstrates modern web technologies including offline-capable data storage, PWA features, and browser-based authentication.

## Working Effectively

### Package Manager Guidelines
- **ONLY use pnpm** - never use npm or yarn commands in this project
- **Lock file management**: Only `pnpm-lock.yaml` should be committed and updated
- **Forbidden**: Do not generate `package-lock.json` or `yarn.lock` files
- **Dependencies**: Use `pnpm add/remove` commands to manage packages
- **Note**: Both `pnpm-lock.yaml` and legacy `package-lock.json` may exist, but only pnpm should be used going forward

### Bootstrap and Dependencies
- **CRITICAL**: Use `pnpm` commands ONLY - this project uses pnpm as the package manager
- **NEVER use npm commands** - they will generate unwanted `package-lock.json` files
- **ALWAYS update `pnpm-lock.yaml`** when adding/removing dependencies
- Install dependencies: `pnpm install` -- takes 4+ minutes to complete. **NEVER CANCEL**. Set timeout to 300+ seconds.
- Add new dependencies: `pnpm add <package>` or `pnpm add -D <package>` for dev dependencies
- Remove dependencies: `pnpm remove <package>`
- Check installed packages: `pnpm list --depth=0`

### Build Commands
- **Development build** (recommended): `pnpm run build:dev` -- takes 35+ seconds. **NEVER CANCEL**. Set timeout to 60+ seconds.
  - This runs Vite build only and WORKS successfully
  - Generates PWA manifest and service worker files
  - Use this for deployments and testing built application
- **Production build**: `pnpm run build` -- **CURRENTLY FAILS** due to 29 TypeScript errors. Takes 5+ seconds to fail. Set timeout to 60+ seconds.
  - Runs `tsc -b && vite build` (TypeScript compilation + Vite build)
  - **Known issue**: TypeScript compilation fails with errors in SQLite integration and WebAuthn demo code
  - Do not attempt to fix TypeScript errors unless specifically requested
- **Preview built app**: `pnpm run preview` -- starts preview server in ~2 seconds

### Development Server
- **IMPORTANT**: The original config includes `mkcert` plugin which may fail in network-restricted environments with `AxiosError: Request failed with status code 403`
- **Workaround for mkcert issues**: Remove the `mkcert()` plugin from `vite.config.ts` temporarily:
  ```typescript
  // Comment out or remove this line:
  // mkcert()
  ```
- Start development server: `pnpm run dev` -- ready in ~2 seconds
- For external access: `pnpm run dev -- --host`
- Development server runs on `http://localhost:5173/`
- **HTTPS note**: WebAuthn and OPFS features work better with HTTPS, but HTTP localhost is sufficient for development

### Linting
- Run ESLint: `pnpm run lint` -- takes 2+ seconds
- **Known issues**: Currently shows 31+ problems (24+ errors, 7+ warnings)
  - Generated files in `dev-dist/` may show TypeScript ESLint rule errors
  - Unused variables in components and routes
  - TypeScript type issues with SQLite worker and WebAuthn code
  - React hooks dependency warnings
  - "@ts-ignore" usage that should be "@ts-expect-error"
- **Before committing**: Always run `pnpm run lint` but expect existing errors
- **Note**: Some errors come from build artifacts - clean `dist/` and `dev-dist/` directories if needed
- Do not fix linting errors unless specifically requested to maintain minimal changes

## Validation and Testing

### Manual Testing Scenarios
After making changes, **ALWAYS** test these complete user scenarios:

1. **SQLite Database Functionality**:
   - Navigate to Home page (`/`)
   - Click "Add" button to insert sample data
   - Verify record appears with random number
   - Check browser console for SQLite logs showing OPFS usage

2. **WebAuthn Authentication Demo**:
   - Navigate to About page (`/about`)
   - Click "Generate DEK (WebCrypto)" button
   - Verify DEK (base64 key) appears in the interface
   - Status should show "DEK generated (shown briefly)"
   - **Expected result**: ![WebAuthn Demo Working](https://github.com/user-attachments/assets/0b3722da-43eb-42aa-89e3-df8ac030c46e)

3. **Excalidraw Diagram Editor**:
   - Navigate to Diagram page (`/diagram`)
   - Verify Excalidraw interface loads with drawing tools
   - Test drawing a simple shape or line

4. **PWA Features**:
   - Check that service worker registers (browser dev tools > Application > Service Workers)
   - Verify manifest.webmanifest is generated and accessible
   - Test offline functionality if possible

5. **Theme Switching**:
   - Click theme toggle button (top-right)
   - Test Light, Dark, and System theme options
   - Verify theme persists across page navigation

6. **Navigation and Routing**:
   - Test all navigation links: Home, Diagram, About
   - Verify URL changes correctly with TanStack Router
   - Check browser back/forward navigation works

### Browser Testing Requirements
- **ALWAYS** test in an actual browser when making changes to React components
- Cannot test WebAuthn or OPFS features through terminal/CLI alone
- Use browser developer tools to check console for errors
- Verify PWA manifest and service worker status in browser dev tools

## Common Issues and Solutions

### TypeScript Compilation Errors
- **Current status**: `pnpm run build` fails with 29 TypeScript errors
- **Workaround**: Use `pnpm run build:dev` which skips TypeScript compilation
- **Common error locations**:
  - `src/database/sqlite-opfs/sqlite-service.tsx` - SQLite worker type issues
  - `src/sqlite-test/sqlite-console.tsx` - Error handling type issues
  - `src/routes/about.tsx` - WebAuthn type annotations

### mkcert Plugin Network Issues
- **Symptom**: `AxiosError: Request failed with status code 403` when starting dev server
- **Solution**: Temporarily remove `mkcert()` from `vite.config.ts`
- **Note**: HTTPS is preferred for WebAuthn but localhost HTTP works for development

### SQLite OPFS Headers
- **Required headers** are configured in `vite.config.ts`:
  ```typescript
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  }
  ```
- These headers are essential for OPFS (Origin Private File System) to work

### WebAuthn Browser Compatibility
- **Requires HTTPS or localhost** for WebAuthn API
- **Platform authenticator** (Windows Hello, Touch ID) required for full functionality
- **Fallback mode** available via checkbox in demo for environments without hmac-secret support

## Project Structure

### Key Directories
- `src/routes/` - TanStack Router pages (index.tsx, about.tsx, diagram.tsx)
- `src/components/` - Reusable React components and UI elements
- `src/database/sqlite-opfs/` - SQLite WASM integration with OPFS
- `src/sqlite-test/` - SQLite testing interface components
- `public/` - Static assets including PWA icons and images

### Important Files
- `vite.config.ts` - Vite configuration with PWA, SQLite, and routing plugins
- `package.json` - Dependencies and pnpm scripts (use pnpm)
- `worker.js` - SQLite WASM worker for database operations
- `LOCAL_DATA_CRYPTO.md` - Documentation for WebAuthn and crypto implementation
- `eslint.config.js` - ESLint configuration
- `netlify.toml` - Deployment configuration using `pnpm run build:dev`

### Technology Stack
- **Frontend**: React 19.1.0, TypeScript, Vite 6.3.5
- **Routing**: TanStack Router with automatic code splitting
- **Database**: SQLite WASM with OPFS for persistent storage
- **PWA**: vite-plugin-pwa with workbox for service worker
- **Styling**: Tailwind CSS 4.1.11 with Radix UI components
- **Authentication**: WebAuthn API demo with platform authenticators
- **Diagrams**: Excalidraw for drawing and diagramming
- **Notifications**: Sonner for toast notifications

## Deployment

### Netlify Configuration
- **Build command**: `pnpm run build:dev` (configured in netlify.toml)
- **Output directory**: `dist`
- **Required headers**: COOP and COEP headers configured for OPFS support

### Build Artifacts
- `dist/` directory contains built application
- `dist/manifest.webmanifest` - PWA manifest
- `dist/sw.js` - Service worker for offline functionality
- `dist/registerSW.js` - Service worker registration

## Security and Crypto Features

### WebAuthn Implementation
- **Demo purposes only** - stores credential ID locally in IndexedDB
- **Platform authenticator** support (Windows Hello, Touch ID, etc.)
- **DEK/KEK encryption** demo with WebCrypto API
- **Fallback mode** for environments without hmac-secret extension
- **Files**: Implementation in `src/routes/about.tsx`, docs in `LOCAL_DATA_CRYPTO.md`

### SQLite OPFS Security
- **Origin-private storage** - data isolated per origin
- **Persistent storage** - survives browser restarts
- **WASM isolation** - SQLite runs in WebAssembly sandbox
- **Cross-origin headers** required for security model

## Performance Notes

### Expected Timing
- **pnpm install**: 4+ minutes (large dependency tree)
- **Development build**: 35+ seconds (Vite + PWA generation)
- **Development server startup**: 2+ seconds
- **Linting**: 2+ seconds
- **Hot reload**: <1 second for most changes

### Large Bundle Warning
- **Expected**: Vite will warn about chunks larger than 500 kB
- **Cause**: Excalidraw, SQLite WASM, and other large dependencies
- **Normal behavior**: This is expected for this feature-rich PWA

**NEVER CANCEL long-running builds or installs - they may take several minutes to complete successfully.**