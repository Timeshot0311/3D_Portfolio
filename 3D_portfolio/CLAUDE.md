# 3D Portfolio — Claude Context

## Project
React Three Fiber 3D portfolio. Interactive room scene with VTuber desktop companion, monitor screens, first-person camera, and mobile touch controls.

## Stack
- **React 19** + **Vite 6**
- **@react-three/fiber v9** + **@react-three/drei v10** + **Three.js 0.177**
- **@pixiv/three-vrm v3** for VTuber model
- **Tailwind v4** (PostCSS plugin: `@tailwindcss/postcss`)

## Key Architecture Rules

### R3F DOM Rendering — CRITICAL
**Never render HTML elements (`<button>`, `<div>`, etc.) inside `<Canvas>` directly.**
R3F's custom reconciler maps JSX tags to `THREE.*` objects — `<button>` → looks for `THREE.Button` → crashes.

Safe patterns inside Canvas:
- `<Html transform>` from `@react-three/drei` — renders real DOM via CSS transform in 3D space (used for monitor screens)
- Three.js primitives only: `<mesh>`, `<primitive>`, `<ambientLight>`, etc.

DOM overlays (HUDs, buttons, panels) must be **outside** `<Canvas>` in `App.jsx` and rendered as normal React DOM components.

### Component Layout (App.jsx)
```
<Canvas>          ← Three.js only
  <RoomScene />   ← uses <Html> for monitor screens
  <VTuberView />  ← pure Three.js
  <FreeCameraControls mode setMode plcLockRef />   ← Three.js logic only
  <MobileControls mode setMode />                  ← Three.js logic only
</Canvas>

<CameraHUD mode setMode plcLockRef />   ← DOM HUD, outside Canvas
<MobileHUD mode setMode />              ← DOM HUD, outside Canvas
```

### Camera State
`cameraMode` state lives in `App.jsx` (`'preset' | 'confirming' | 'free'`) and is passed as props to both the Canvas component (for useFrame logic) and the DOM HUD (for rendering).

`plcLockRef` — ref set by `FreeCameraControls` to expose `PointerLockControls.lock()` to `CameraHUD`.

### Shared Mobile State (module-level in MobileControls.jsx)
```js
move, look           // joystick deltas, written by touch handlers, read by useFrame
mobilePresetTarget, mobileLerpingRef, mobileTargetQuat  // shared between MobileHUD (goToPreset) and MobileControls (useFrame)
```

## Public Assets
```
public/
  models/      timeshot-room2.glb, VTuber2.vrm
  hdr/         environment maps
  music/       background audio
  v86/
    libv86.js, v86.wasm
    bios/  seabios.bin, vgabios.bin
    images/ TinyCore-current.iso   ← exact filename (not tinycore.iso)
```

## VTuber Camera Companion — Positioning
VTuberView is **scene-based** (`<primitive object={group} />`), NOT `camera.add`.
Every frame in `useFrame`:
```js
_worldPos.set(CAM_OFFSET.x + floatX, CAM_OFFSET.y + floatY, CAM_OFFSET.z)
         .applyMatrix4(camera.matrixWorld);
group.position.copy(_worldPos);
group.quaternion.copy(camera.quaternion);
```
VRM0 models naturally face -Z. `rotateVRM0` flips them to face +Z.
When group quaternion = camera quaternion, local +Z = camera's +Z in world = toward viewer. ✓
**Always call `VRMUtils.rotateVRM0(vrm)`** before adding vrm.scene to the group.

## VTuber AI Chat
- `api/chat.js` — Vercel serverless function, proxies to Claude Haiku. Set `ANTHROPIC_API_KEY` env var on Vercel.
- `src/components/VTuberChat.jsx` — DOM chat bubble (outside Canvas). Uses Web Speech API for TTS.
- `isSpeaking` state in `App.jsx` flows: `VTuberChat onSpeakingChange` → `App.isSpeaking` → `VTuberView isSpeaking` prop → phoneme lip sync in `useFrame`.

## RoomScene — Screen Node Finding
GLB nodes for monitor screens are `Object3D` groups, NOT `Mesh` instances.
Use `findScreenNode` (name-only search, no `isMesh` check).
`Box3.setFromObject(node)` traverses the subtree and works on any Object3D.

## File Map
```
src/
  App.jsx                          entry, camera + isSpeaking state
  models/RoomScene.jsx             room GLB + Html screen overlays
  components/
    FreeCameraControls.jsx         Three.js WASD + PointerLock (Canvas only)
    CameraHUD.jsx                  desktop HUD DOM (outside Canvas)
    MobileControls.jsx             Three.js touch camera (Canvas only)
    MobileHUD.jsx                  mobile overlay DOM (outside Canvas)
    VTuberView.jsx                 VRM model, camera-relative, lip sync
    VTuberChat.jsx                 AI chat bubble DOM (outside Canvas)
    FakeOSDesktop.jsx              fake OS UI rendered on monitor via Html
    GitHubStats.jsx                GitHub stats on small monitor via Html
    BackgroundMusic.jsx
    Loader.jsx
api/
  chat.js                          Vercel serverless → Claude Haiku proxy
```
