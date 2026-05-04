# 3D Portfolio — Claude Context

## Project
React Three Fiber 3D portfolio. Interactive room scene with VTuber desktop companion, monitor screens, first-person camera, and mobile touch controls.

## Stack
- **React 19** + **Vite 6** (`npm run dev` / `build` / `preview`)
- **@react-three/fiber v9** + **@react-three/drei v10** + **Three.js 0.177**
- **@pixiv/three-vrm v3** + `@pixiv/three-vrm-animation` for VRM + `.vrma` clips
- **Tailwind v4** (PostCSS plugin: `@tailwindcss/postcss`) + inline style objects for complex overlays

## Key Architecture Rules

### R3F DOM Rendering — CRITICAL
**Never render HTML elements (`<button>`, `<div>`, etc.) inside `<Canvas>`.** R3F maps JSX tags to `THREE.*` — `<button>` → looks for `THREE.Button` → crashes.

Safe inside Canvas:
- `<Html transform>` from drei (used for monitor screen overlays)
- Three.js primitives: `<mesh>`, `<primitive>`, `<ambientLight>`, etc.

DOM HUDs and panels (CameraHUD, MobileHUD, VTuberChat, Loader) live **outside** `<Canvas>` in `App.jsx`.

### App.jsx Layout
```
<Loader />                          ← pre-scene overlay, blocks until vrmPreloaded
<Canvas>
  <RoomScene />                     ← uses <Html> for monitor screens
  <VTuberView emoteRef screenPosRef ... />
  <FreeCameraControls plcLockRef />
  <MobileControls />
</Canvas>
<CameraHUD plcLockRef onChatToggle onMicToggle ... />   ← desktop HUD
<MobileHUD ... />                                        ← mobile HUD
<VTuberChat emoteRef screenPosRef onSpeakingChange ... />
```

### App.jsx Lifted State (do not move)
- `cameraMode`: `'preset' | 'confirming' | 'free'` — drives both useFrame logic and HUD UI
- `vrmPreloaded`: gates Loader → scene transition
- `vtuberReady`: VRM is in scene; chat won't start without it
- `chatOpen`: lifted so CameraHUD's chat button can toggle the panel
- `isSpeaking`: VTuberChat → App → VTuberView prop → drives lip-sync
- Refs: `plcLockRef` (HUD → PointerLock), `emoteRef` (Chat → VTuberView API), `screenPosRef` (VTuberView → Chat bubble follow), `vtChatControlRef` (HUD mic → Chat)

## Buttons & HUDs

### CameraHUD.jsx (desktop, fixed top-right, z 9999)
| Button | Action |
|---|---|
| Overview / Desk / Left Monitor / Right Monitor | `setMode('preset')` + `goToPreset(idx)` |
| FREE CAM | `setMode('confirming')` → confirm dialog (z 10000) → `setTimeout(150)` → `plcLockRef.current?.()` for pointer lock |
| 💬 CHAT | `onChatToggle` → toggles `chatOpen` |
| 🎤 MIC | `onMicToggle` → `vtChatControlRef.current?.toggleMic()` |

Buttons use `clipPath: polygon(...)` for angled corners — preserve when restyling.

### MobileHUD.jsx (touch only)
Renders **only** the joystick (free mode) and the free-cam confirmation dialog (confirming mode). In preset mode it returns `null` — CameraHUD now serves mobile too, so duplicate preset buttons were removed. Joystick deltas live in **module-level state** in MobileControls.jsx (`move`, `look`, `mobilePresetTarget`, `mobileLerpingRef`, `mobileTargetQuat`) — written by touch handlers, read by useFrame.

## Screens & Positioning

### Monitor Overlays (in RoomScene via drei `<Html>`)
- **Large monitor** → `large_monitor_screen` node → `<FakeOSDesktop>` (projects portfolio UI)
- **Small monitor** → `small_monitor_screen` node → `<GitHubStats>`
- Node names are **load-bearing** — renaming in Blender breaks overlays
- Nodes are `Object3D` groups, not `Mesh`. Use `findScreenNode` (name-only, no `isMesh` check); `Box3.setFromObject` traverses subtree
- `SCREEN_W` (e.g. `fakeOS = 162`) and `CSS_W = 768` are manual overrides compensating drei's internal scaling — brittle if canvas size changes

### VTuber Camera Companion
Scene-based (`<primitive object={group} />`), **NOT** `camera.add`. Every frame:
```js
_worldPos.set(CAM_OFFSET.x + floatX, CAM_OFFSET.y + floatY, CAM_OFFSET.z)
         .applyMatrix4(camera.matrixWorld);
group.position.copy(_worldPos);
group.quaternion.copy(camera.quaternion);
```
- `CAM_OFFSET = (-0.52, 0.05, -1.1)`, `CAM_SCALE = 0.22`, `FLOAT_AMP` for idle bob
- VRM0 faces -Z. **Always call `VRMUtils.rotateVRM0(vrm)`** before adding to group
- Head world→screen projected each frame to `screenPosRef.current = {x, y}` so chat bubble tracks her head

### Camera Presets
`CAMERA_PRESETS` in FreeCameraControls.jsx are **hardcoded position + quaternion**. To re-measure after a room model change: enter free cam, use `window.__camera` inspector to read pos/quat.

## VTuber System

### Model & Animations
- Model: `/public/models/VTuber3.vrm` — preloaded in App.jsx `useEffect` via `GLTFLoader` + `VRMLoaderPlugin` before scene shows
- `.vrma` clips at `/public/animations/{name}.vrma`, loaded in parallel via `VRMAnimationLoaderPlugin`
- **Available emotes (do NOT hallucinate others)**: `idle` (default loop), `wave`, `peace`, `shoot`, `pose`, `dance`
- 404s on missing clips are silent — model still works
- Each clip pre-baked into `THREE.AnimationAction`; crossfade `EMOTE_FADE = 0.3s`; one-shots auto-return to `idle`

### Emote API
`emoteRef.current = { play(name), list() }` — exposed by VTuberView, called by VTuberChat on keyword match (`EMOTE_PATTERNS`). System prompt in `api/chat.js` constrains the AI to only the available emote names.

### Audio-Start Handshake (load-bearing)
Lip-sync, emote trigger, and bubble all sync to the audio `'playing'` event:
1. VTuberChat `speak()` returns a promise that resolves on `<audio>.playing`
2. At that exact moment: `setIsSpeaking(true)` → VTuberView starts phoneme cycle (`PHONEMES = ['aa','ih','ou','ee','oh']`), emote fires, bubble shows
3. On `'ended'`: `setIsSpeaking(false)`, mouth closes, emote fades to idle

Breaking this handshake = mouth-flap before audio, or emote firing into silence.

### Chat & TTS APIs
- `api/chat.js` — Vercel serverless → **Groq `llama-3.1-8b`** (env `GROQ_API_KEY`). System prompt enforces personality + emote vocabulary.
- `api/tts.js` — ElevenLabs (env `ELEVENLABS_API_KEY`); tries `eleven_multilingual_v2` → `eleven_turbo_v2` → `eleven_monolingual_v1`; falls back to browser `SpeechSynthesis` if all fail
- Web Speech API for mic input (browser-only, alerts on missing API)

## Public Assets
```
public/
  models/      timeshot-room2.glb, VTuber3.vrm
  animations/  idle.vrma, wave.vrma, peace.vrma, shoot.vrma, pose.vrma, dance.vrma
  hdr/         environment maps
  music/       background audio
  v86/         libv86.js, v86.wasm
    bios/      seabios.bin, vgabios.bin
    images/    TinyCore-current.iso   ← exact filename
```

## File Map
```
src/
  App.jsx                          entry, lifted state, refs, preload
  main.jsx                         ReactDOM mount
  models/RoomScene.jsx             room GLB + <Html> screen overlays
  components/
    Loader.jsx                     pre-scene overlay, VRM progress, Enter button
    FreeCameraControls.jsx         WASD + PointerLock (Canvas only) — CAMERA_PRESETS here
    CameraHUD.jsx                  desktop HUD (outside Canvas)
    MobileControls.jsx             touch camera (Canvas only) + module-level shared state
    MobileHUD.jsx                  mobile overlay (outside Canvas)
    VTuberView.jsx                 VRM, camera-relative pin, emote API, lip sync
    VTuberChat.jsx                 chat bubble + panel, mic, TTS, audio-start handshake
    FakeOSDesktop.jsx              projects UI on large monitor
    GitHubStats.jsx                GitHub stats on small monitor
    BackgroundMusic.jsx
api/
  chat.js                          Vercel → Groq llama-3.1-8b
  tts.js                           Vercel → ElevenLabs
```

## Gotchas
1. **VRM preload gates the scene** — Loader must not unmount before `vrmPreloaded`, or VTuberView mounts without a model
2. **Pointer lock needs setTimeout(150)** after closing the confirm dialog so the DOM updates before `lock()` is called
3. **Monitor screen node names** (`large_monitor_screen`, `small_monitor_screen`) are hardcoded — Blender renames silently break overlays
4. **`SCREEN_W` / `CSS_W` magic numbers** in RoomScene compensate drei `<Html>` scaling — re-tune if canvas size changes
5. **Camera presets are hardcoded coords** — remeasure with `window.__camera` after room model changes
6. **Don't invent VRMA animations** — only the six listed above exist; the AI's system prompt enforces this
7. **Audio-start handshake** — never decouple lip-sync/emote/bubble from the `'playing'` event
8. **No error boundary** around VTuberView — load failures crash the Canvas silently
9. **No global state** (no Zustand/Context) — all cross-component comms go through App.jsx props or refs
