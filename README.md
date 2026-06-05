# Hippo Heist

A fun browser-based **3D** arcade game where you play as a mischievous hippo stealing bananas to feed a hungry leopard while avoiding angry farmers — now rendered as a real 3D world you view from an angled top-down camera, set in a grassy valley ringed by mountains.

## Play Now

Simply open `index.html` in any modern web browser - no installation required!

<img width="500" alt="image" src="https://github.com/user-attachments/assets/6dd2d93f-944b-4524-8d9e-8a29a1be2b5c" />

## Gameplay

You're a hippo with a mission: steal bananas from trees and feed them to a leopard. But watch out - the farmers aren't happy about your thievery!

### Controls

| Key | Action |
|-----|--------|
| Arrow Keys / WASD | Move (relative to the camera) |
| Space | Pick up bananas / Feed leopard / Eat farmers |
| Q / E | Rotate camera left / right |
| Mouse drag | Orbit the camera |
| Mouse wheel | Zoom in / out |
| Mute button | Toggle music/sound |

On touch devices: drag to orbit, pinch to zoom, joystick to move, on-screen button to act.

### Mechanics

- **Collect Bananas** - Walk near banana trees and press Space to grab bananas (carry up to 5)
- **Feed the Leopard** - Bring bananas to the leopard and press Space to feed it
- **Avoid Farmers** - They patrol the area and will chase you if spotted
- **Use Water** - Hide in water to escape farmers (they can't swim!)
- **Beat the Clock** - Complete each level before time runs out

<img width="500" alt="image" src="https://github.com/user-attachments/assets/c107495f-fab7-4cda-bc29-028b08c706d1" />

## Levels

| Level | Name | Challenge |
|-------|------|-----------|
| 1 | First Heist | Learn the basics with a caged leopard |
| 2 | River Run | Navigate rivers and more farmers |
| 3 | Wild Chase | The leopard roams free - farmers flee from it! |
| 4 | The Hunt | The leopard hunts farmers - use it strategically! |

## Features

- Real-time **3D graphics** (WebGL) with an orbiting, angled top-down camera
- A grassy valley ringed by procedurally generated **mountains**, animated shader water, dynamic sunlight and soft shadows
- Fully procedural 3D models, textures and animations — hippo, leopard, farmers and palm trees, all built at runtime (no asset files)
- Layered, synthesized audio: richer sound effects, an ambient nature bed (wind + birds), and per-level music — all generated via the Web Audio API
- 3D particle effects, camera shake, and floating feedback text
- Progressive difficulty with unique level mechanics
- Vanilla JavaScript with a single vendored library (Three.js) — no build step, runs by opening `index.html`

## Technical Details

Built with:
- Three.js (WebGL) for 3D rendering — vendored locally in `js/vendor/` so the game stays self-contained and offline-capable
- Procedurally generated geometry and canvas textures (no image/model files)
- Web Audio API for fully synthesized sound, ambience and music
- Pure JavaScript (ES6+) - no build step or server required

See [DEVELOPMENT.md](DEVELOPMENT.md) for technical documentation.

<img width="500" alt="image" src="https://github.com/user-attachments/assets/7971dfd9-5411-48c4-a415-bdbc1813a1c6" />

## Browser Support

Works in all modern browsers:
- Chrome
- Firefox
- Safari
- Edge

## License

MIT License - feel free to use, modify, and share!

---

*Have fun stealing bananas!*
