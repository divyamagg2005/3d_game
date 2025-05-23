
"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import {
    PLAYER_SPEED,
    PLAYER_SENSITIVITY,
    GROUND_SIZE,
    PLAYER_JUMP_FORCE,
    GRAVITY,
    PLAYER_RUN_MULTIPLIER,
    PLAYER_NORMAL_HEIGHT,
    PLAYER_CROUCH_HEIGHT,
    PLAYER_CROUCH_SPEED_MULTIPLIER,
    MAX_AIR_JUMPS
} from '@/config/game-constants';

interface DayNightPhase {
  name: string;
  duration: number; // as a fraction of total cycle time
  ambient: [number, number]; // [color, intensity]
  directional: [number, number]; // [color, intensity]
  background: number; // color
  fog: number; // color
}

const dayNightCycleConfig = {
  cycleDuration: 120, // 120 seconds for a full cycle (2 minutes)
  phases: [
    { name: 'Day', duration: 0.4, ambient: [0xffffff, 1.8], directional: [0xffffff, 2.5], background: 0xCAEFFF, fog: 0xCAEFFF }, // Bright day
    { name: 'Dusk', duration: 0.15, ambient: [0xffaa77, 0.4], directional: [0xffaa77, 0.5], background: 0x403050, fog: 0x403050 }, // Dimming dusk
    { name: 'Night', duration: 0.3, ambient: [0x101020, 0.02], directional: [0x151525, 0.05], background: 0x00000A, fog: 0x00000A }, // Dark night
    { name: 'Dawn', duration: 0.15, ambient: [0x88aabb, 0.3], directional: [0x88aabb, 0.4], background: 0x304060, fog: 0x304060 }, // Brightening dawn
  ] as DayNightPhase[],
};


interface DayNightCycleState {
  currentTime: number;
  currentPhaseDetails: {
    ambientColor: THREE.Color;
    ambientIntensity: number;
    directionalColor: THREE.Color;
    directionalIntensity: number;
    backgroundColor: THREE.Color;
    fogColor: THREE.Color;
  };
}

function getInterpolatedColor(color1: THREE.Color, color2: THREE.Color, factor: number): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, factor);
}

function getInterpolatedFloat(val1: number, val2: number, factor: number): number {
  return val1 + (val2 - val1) * factor;
}

const PLAYER_COLLISION_RADIUS = 0.4;

// Helper function for collision detection
function checkCollisionWithObjects(
    playerObject: THREE.Object3D, // camera object from controls
    obstacleMeshes: THREE.Mesh[],
    radius: number,
    playerCurrentEyeHeight: number
): boolean {
    const playerXZPos = playerObject.position;

    const playerColliderBox = new THREE.Box3(
        new THREE.Vector3(playerXZPos.x - radius, playerObject.position.y - playerCurrentEyeHeight, playerXZPos.z - radius),
        new THREE.Vector3(playerXZPos.x + radius, playerObject.position.y + 0.1, playerXZPos.z + radius) // Max Y is eye level + small headroom
    );


    for (const obstacle of obstacleMeshes) {
        if (!obstacle.geometry.boundingBox) {
            obstacle.geometry.computeBoundingBox();
        }
        const obstacleBox = new THREE.Box3().copy(obstacle.geometry.boundingBox!).applyMatrix4(obstacle.matrixWorld);

        if (playerColliderBox.intersectsBox(obstacleBox)) {
            return true;
        }
    }
    return false;
}


export default function ArenaDisplay() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<PointerLockControls | null>(null);

  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);

  const velocity = useRef(new THREE.Vector3());
  const verticalVelocity = useRef(0);
  const onGround = useRef(true);
  const isRunning = useRef(false);
  const isCrouching = useRef(false);
  const jumpsMadeInAirRef = useRef(0);


  const direction = useRef(new THREE.Vector3());
  const prevTime = useRef(performance.now());
  const isPaused = useRef(false);

  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);
  const buildingsRef = useRef<THREE.Mesh[]>([]);
  const playerLastSurfaceY = useRef(0); // Stores the Y of the surface player is on (feet level)


  const [dayNightCycle, setDayNightCycle] = useState<DayNightCycleState>(() => {
    const initialPhase = dayNightCycleConfig.phases[0];
    playerLastSurfaceY.current = 0; // Initialize on main ground
    return {
      currentTime: 0,
      currentPhaseDetails: {
        ambientColor: new THREE.Color(initialPhase.ambient[0]),
        ambientIntensity: initialPhase.ambient[1],
        directionalColor: new THREE.Color(initialPhase.directional[0]),
        directionalIntensity: initialPhase.directional[1],
        backgroundColor: new THREE.Color(initialPhase.background),
        fogColor: new THREE.Color(initialPhase.fog),
      },
    };
  });


  const onKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        moveForward.current = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        moveLeft.current = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        moveBackward.current = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        moveRight.current = true;
        break;
      case 'Space':
        if (!isPaused.current && controlsRef.current?.isLocked) {
          if (onGround.current) {
            verticalVelocity.current = PLAYER_JUMP_FORCE;
            onGround.current = false;
            jumpsMadeInAirRef.current = 0;
          } else if (jumpsMadeInAirRef.current < MAX_AIR_JUMPS) {
            verticalVelocity.current = PLAYER_JUMP_FORCE;
            jumpsMadeInAirRef.current++;
          }
        }
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        isRunning.current = true;
        break;
      case 'ControlLeft':
      case 'KeyC':
         if (!isPaused.current && controlsRef.current?.isLocked) {
            isCrouching.current = !isCrouching.current;
         }
        break;
      case 'KeyP': {
        isPaused.current = !isPaused.current;
        const pausedMessageEl = document.getElementById('paused-message');
        const instructionsEl = document.getElementById('instructions');
        const blockerEl = document.getElementById('blocker');

        if (isPaused.current) {
          if (controlsRef.current?.isLocked) {
            controlsRef.current.unlock();
          }
          if (blockerEl) blockerEl.style.display = 'grid';
          if (pausedMessageEl) pausedMessageEl.style.display = 'block';
          if (instructionsEl) instructionsEl.style.display = 'none';
        } else { // Unpausing
          if (pausedMessageEl) pausedMessageEl.style.display = 'none';
          if (blockerEl) {
            if (!controlsRef.current?.isLocked) {
              blockerEl.style.display = 'grid';
              if (instructionsEl) instructionsEl.style.display = '';
            } else { // Game is active (pointer is locked)
              blockerEl.style.display = 'none';
              if (instructionsEl) instructionsEl.style.display = 'none';
            }
          }
        }
        break;
      }
    }
  }, []);

  const onKeyUp = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        moveForward.current = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        moveLeft.current = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        moveBackward.current = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        moveRight.current = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        isRunning.current = false;
        break;
    }
  }, []);

  const clickToLockHandler = useCallback(() => {
    const instructionsEl = document.getElementById('instructions');
    const blockerEl = document.getElementById('blocker');
    const pausedMessageEl = document.getElementById('paused-message');

    // Desktop Pointer Lock logic
    if (!isPaused.current && controlsRef.current && !controlsRef.current.isLocked) {
      if (typeof controlsRef.current.domElement.requestPointerLock === 'function') {
        controlsRef.current.lock();
      } else {
        console.error('ArenaDisplay: requestPointerLock API is not a function on domElement. Pointer lock cannot be initiated.');
        // Still hide UI elements as if lock was attempted but failed pre-API check, effectively "starting" game view.
        if (instructionsEl) instructionsEl.style.display = 'none';
        if (blockerEl) blockerEl.style.display = 'none';
        if (pausedMessageEl) pausedMessageEl.style.display = 'none';
        isPaused.current = false;
      }
    }
  }, []);

  const onLockHandler = useCallback(() => {
    const instructionsEl = document.getElementById('instructions');
    const blockerEl = document.getElementById('blocker');
    const pausedMessageEl = document.getElementById('paused-message');

    if (instructionsEl) instructionsEl.style.display = 'none';
    if (blockerEl) blockerEl.style.display = 'none';
    if (pausedMessageEl) pausedMessageEl.style.display = 'none';

    isPaused.current = false;
  }, []);

  const onUnlockHandler = useCallback(() => {
    const instructionsEl = document.getElementById('instructions');
    const blockerEl = document.getElementById('blocker');
    const pausedMessageEl = document.getElementById('paused-message');

    if (blockerEl) blockerEl.style.display = 'grid';

    if (isPaused.current) {
      if (pausedMessageEl) pausedMessageEl.style.display = 'block';
      if (instructionsEl) instructionsEl.style.display = 'none';
    } else {
      if (pausedMessageEl) pausedMessageEl.style.display = 'none';
      if (instructionsEl) instructionsEl.style.display = '';
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !mountRef.current) return;

    const currentMount = mountRef.current;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    const initialPlayerEyeHeight = PLAYER_NORMAL_HEIGHT;
    camera.position.set(0, initialPlayerEyeHeight, 5);
    playerLastSurfaceY.current = 0; // Player starts on ground at Y=0
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.tabIndex = -1; // Make the canvas element itself focusable
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new PointerLockControls(camera, renderer.domElement);
    controls.pointerSpeed = PLAYER_SENSITIVITY / 0.002; // Adjust if needed
    scene.add(controls.getObject());
    controlsRef.current = controls;

    const instructionsElement = document.getElementById('instructions');
    const blockerElement = document.getElementById('blocker');
    const pausedMessageElement = document.getElementById('paused-message');

    if (blockerElement) {
        blockerElement.addEventListener('click', clickToLockHandler);
    }
    controls.addEventListener('lock', onLockHandler);
    controls.addEventListener('unlock', onUnlockHandler);

    if (pausedMessageElement) pausedMessageElement.style.display = 'none';

    // Initial UI state based on desktop context
    if (currentMount) {
      if (!controls.isLocked ) {
        if (blockerElement) blockerElement.style.display = 'grid';
        if (instructionsElement) instructionsElement.style.display = '';
        if (isPaused.current) {
             if (pausedMessageElement) pausedMessageElement.style.display = 'block';
             if (instructionsElement) instructionsElement.style.display = 'none';
        }
      } else {
        if (blockerElement) blockerElement.style.display = 'none';
        if (instructionsElement) instructionsElement.style.display = 'none';
        if (pausedMessageElement) pausedMessageElement.style.display = 'none';
        isPaused.current = false;
      }
    }

    ambientLightRef.current = new THREE.AmbientLight();
    scene.add(ambientLightRef.current);

    directionalLightRef.current = new THREE.DirectionalLight();
    directionalLightRef.current.position.set(20, 50, 20);
    directionalLightRef.current.castShadow = true;
    directionalLightRef.current.shadow.mapSize.width = 2048;
    directionalLightRef.current.shadow.mapSize.height = 2048;
    directionalLightRef.current.shadow.camera.near = 0.5;
    directionalLightRef.current.shadow.camera.far = 500;
    directionalLightRef.current.shadow.camera.left = -GROUND_SIZE;
    directionalLightRef.current.shadow.camera.right = GROUND_SIZE;
    directionalLightRef.current.shadow.camera.top = GROUND_SIZE;
    directionalLightRef.current.shadow.camera.bottom = -GROUND_SIZE;
    scene.add(directionalLightRef.current);

    const textureLoader = new THREE.TextureLoader();
    const textureLoadError = (textureName: string) => (event: ErrorEvent | Event) => {
      console.error(`ArenaDisplay: Texture loading failed for '${textureName}'. Attempted path: /textures/${textureName}`);
      if (event && 'message' in event && event instanceof ErrorEvent) {
        console.error('ErrorEvent details:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          errorObject: event.error,
        });
      } else if (event && event.target instanceof Image) {
        console.error('Image load error on target. src:', (event.target as HTMLImageElement).src);
      } else {
        console.error('An unknown error occurred during texture loading, or event details are unavailable.', event);
      }
    };


    const groundTexture = textureLoader.load('/textures/ground-texture.jpg', undefined, undefined, textureLoadError('ground-texture.jpg'));
    const roofTexture = textureLoader.load('/textures/roof-texture.jpg', undefined, undefined, textureLoadError('roof-texture.jpg'));
    const wallTexture1 = textureLoader.load('/textures/wall-texture-1.jpg', undefined, undefined, textureLoadError('wall-texture-1.jpg'));
    const wallTexture2 = textureLoader.load('/textures/wall-texture-2.jpg', undefined, undefined, textureLoadError('wall-texture-2.jpg'));
    const wallTexture3 = textureLoader.load('/textures/wall-texture-3.jpg', undefined, undefined, textureLoadError('wall-texture-3.jpg'));

    const allTextures = [groundTexture, roofTexture, wallTexture1, wallTexture2, wallTexture3];
    allTextures.forEach(texture => {
      if (texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
      }
    });

    if (groundTexture) groundTexture.repeat.set(GROUND_SIZE / 10, GROUND_SIZE / 10);

    const texturedGroundMaterial = new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 0.9,
      metalness: 0.1
    });

    const placeholderBottomMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9, metalness: 0.1 });

    const makeBuildingFaceMaterials = (wallMap: THREE.Texture | null, roofMap: THREE.Texture | null, sideRoughness: number, sideMetalness: number) => [
      new THREE.MeshStandardMaterial({ map: wallMap, roughness: sideRoughness, metalness: sideMetalness }),
      new THREE.MeshStandardMaterial({ map: wallMap, roughness: sideRoughness, metalness: sideMetalness }),
      new THREE.MeshStandardMaterial({ map: roofMap, roughness: 0.8, metalness: 0.2 }),
      placeholderBottomMaterial,
      new THREE.MeshStandardMaterial({ map: wallMap, roughness: sideRoughness, metalness: sideMetalness }),
      new THREE.MeshStandardMaterial({ map: wallMap, roughness: sideRoughness, metalness: sideMetalness })
    ];

    const residentialMaterials = makeBuildingFaceMaterials(wallTexture1, roofTexture, 0.8, 0.2);
    const commercialMaterials = makeBuildingFaceMaterials(wallTexture2, roofTexture, 0.6, 0.4);
    const industrialMaterials = makeBuildingFaceMaterials(wallTexture3, roofTexture, 0.9, 0.6);
    const downtownMaterials = makeBuildingFaceMaterials(wallTexture2, roofTexture, 0.4, 0.7);

    const smokestackMaterial = new THREE.MeshStandardMaterial({ map: wallTexture3, roughness: 0.9, metalness: 0.6 });


    const groundGeometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const ground = new THREE.Mesh(groundGeometry, texturedGroundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const wallHeight = GROUND_SIZE ;
    const wallThickness = 10;
    const boundaryWallMaterial = new THREE.MeshStandardMaterial({ color: 0x1A1A1D, roughness: 0.95, metalness: 0.1 });

    const wallN = new THREE.Mesh(new THREE.BoxGeometry(GROUND_SIZE + wallThickness * 2, wallHeight, wallThickness), boundaryWallMaterial);
    wallN.position.set(0, wallHeight/2, -GROUND_SIZE/2 - wallThickness/2);
    wallN.castShadow = true; wallN.receiveShadow = true; scene.add(wallN); buildingsRef.current.push(wallN);

    const wallS = new THREE.Mesh(new THREE.BoxGeometry(GROUND_SIZE + wallThickness * 2, wallHeight, wallThickness), boundaryWallMaterial);
    wallS.position.set(0, wallHeight/2, GROUND_SIZE/2 + wallThickness/2);
    wallS.castShadow = true; wallS.receiveShadow = true; scene.add(wallS); buildingsRef.current.push(wallS);

    const wallE = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, GROUND_SIZE), boundaryWallMaterial);
    wallE.position.set(GROUND_SIZE/2 + wallThickness/2, wallHeight/2, 0);
    wallE.castShadow = true; wallE.receiveShadow = true; scene.add(wallE); buildingsRef.current.push(wallE);

    const wallW = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, GROUND_SIZE), boundaryWallMaterial);
    wallW.position.set(-GROUND_SIZE/2 - wallThickness/2, wallHeight/2, 0);
    wallW.castShadow = true; wallW.receiveShadow = true; scene.add(wallW); buildingsRef.current.push(wallW);

    const buildingOffset = GROUND_SIZE / 4;

    const addBuilding = (geometry: THREE.BufferGeometry, materials: THREE.Material | THREE.Material[], x: number, yBase: number, z: number) => {
      const buildingHeight = (geometry.parameters as any).height;
      const building = new THREE.Mesh(geometry, materials);
      building.position.set(x, yBase + buildingHeight / 2, z);
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);
      buildingsRef.current.push(building);
    };

    // Residential Area
    addBuilding(new THREE.BoxGeometry(4, 3, 5), residentialMaterials, -buildingOffset, 0, -buildingOffset + 5);
    addBuilding(new THREE.BoxGeometry(5, 2.5, 4), residentialMaterials, -buildingOffset + 8, 0, -buildingOffset -2);
    addBuilding(new THREE.BoxGeometry(6, 8, 5), residentialMaterials, -buildingOffset - 5, 0, -buildingOffset - 8);
    addBuilding(new THREE.BoxGeometry(4.5, 3.5, 5.5), residentialMaterials, -buildingOffset - 12, 0, -buildingOffset + 10);
    addBuilding(new THREE.BoxGeometry(5, 3, 4.5), residentialMaterials, -buildingOffset + 15, 0, -buildingOffset + 15);
    addBuilding(new THREE.BoxGeometry(3.5, 2, 6), residentialMaterials, -buildingOffset + 2, 0, -buildingOffset -15);
    addBuilding(new THREE.BoxGeometry(4, 2, 4), residentialMaterials, -buildingOffset + 20, 0, -buildingOffset + 5);
    addBuilding(new THREE.BoxGeometry(5, 4, 5), residentialMaterials, -buildingOffset - 18, 0, -buildingOffset - 18);


    // Commercial Zone
    addBuilding(new THREE.BoxGeometry(7, 5, 6), commercialMaterials, buildingOffset, 0, -buildingOffset);
    addBuilding(new THREE.BoxGeometry(5, 10, 5), commercialMaterials, buildingOffset + 10, 0, -buildingOffset + 8);
    addBuilding(new THREE.BoxGeometry(8, 6, 7), commercialMaterials, buildingOffset - 8, 0, -buildingOffset - 10);
    addBuilding(new THREE.BoxGeometry(6, 9, 6), commercialMaterials, buildingOffset + 18, 0, -buildingOffset - 5);
    addBuilding(new THREE.BoxGeometry(7.5, 5.5, 6.5), commercialMaterials, buildingOffset + 3, 0, -buildingOffset + 18);
    addBuilding(new THREE.BoxGeometry(6.5, 7, 5), commercialMaterials, buildingOffset - 15, 0, -buildingOffset + 12);
    addBuilding(new THREE.BoxGeometry(5.5, 6, 5.5), commercialMaterials, buildingOffset + 22, 0, -buildingOffset + 22);


    // Industrial Sector
    addBuilding(new THREE.BoxGeometry(15, 6, 10), industrialMaterials, -buildingOffset + 5, 0, buildingOffset);

    const factoryGeom = new THREE.BoxGeometry(10, 8, 8);
    const factory = new THREE.Mesh(factoryGeom, industrialMaterials);
    factory.position.set(-buildingOffset - 10, 8 / 2, buildingOffset + 12);
    factory.castShadow = true; factory.receiveShadow = true; scene.add(factory); buildingsRef.current.push(factory);

    const factorySmokestackGeom = new THREE.CylinderGeometry(1.5, 1.5, 18, 16);
    const factorySmokestack = new THREE.Mesh(factorySmokestackGeom, smokestackMaterial);
    factorySmokestack.position.set(-buildingOffset - 13.5, 18 / 2, buildingOffset + 14);
    factorySmokestack.castShadow = true; factorySmokestack.receiveShadow = true; scene.add(factorySmokestack); buildingsRef.current.push(factorySmokestack);

    addBuilding(new THREE.BoxGeometry(12, 7, 9), industrialMaterials, -buildingOffset - 20, 0, buildingOffset - 5);
    addBuilding(new THREE.BoxGeometry(18, 5, 12), industrialMaterials, -buildingOffset + 20, 0, buildingOffset + 20);
    addBuilding(new THREE.BoxGeometry(9, 4, 11), industrialMaterials, -buildingOffset - 2, 0, buildingOffset + 25);
    addBuilding(new THREE.BoxGeometry(14, 6.5, 8.5), industrialMaterials, -buildingOffset + 15, 0, buildingOffset - 10);


    // Downtown Area
    addBuilding(new THREE.BoxGeometry(6, 15, 6), downtownMaterials, buildingOffset, 0, buildingOffset);
    addBuilding(new THREE.BoxGeometry(7, 25, 7), downtownMaterials, buildingOffset + 12, 0, buildingOffset + 12);
    addBuilding(new THREE.BoxGeometry(5.5, 20, 5.5), downtownMaterials, buildingOffset - 7, 0, buildingOffset + 8);
    addBuilding(new THREE.BoxGeometry(6.5, 18, 6.5), downtownMaterials, buildingOffset + 20, 0, buildingOffset - 10);
    addBuilding(new THREE.BoxGeometry(5, 22, 5), downtownMaterials, buildingOffset - 15, 0, buildingOffset - 15);
    addBuilding(new THREE.BoxGeometry(8, 30, 8), downtownMaterials, buildingOffset + 25, 0, buildingOffset + 25);
    addBuilding(new THREE.BoxGeometry(4.5, 16, 4.5), downtownMaterials, buildingOffset - 20, 0, buildingOffset + 20);

    const obstacleMaterials = [residentialMaterials, commercialMaterials, industrialMaterials, downtownMaterials];
    for (let i = 0; i < 50; i++) {
        const sizeX = Math.random() * 2 + 1;
        const sizeY = Math.random() * 3 + 1;
        const sizeZ = Math.random() * 2 + 1;
        const posX = (Math.random() - 0.5) * (GROUND_SIZE - sizeX);
        const posZ = (Math.random() - 0.5) * (GROUND_SIZE - sizeZ);
        const matIndex = Math.floor(Math.random() * obstacleMaterials.length);
        addBuilding(new THREE.BoxGeometry(sizeX, sizeY, sizeZ), obstacleMaterials[matIndex], posX, 0, posZ);
    }


    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current && mountRef.current) {
        cameraRef.current.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = performance.now();
      const delta = (time - prevTime.current) / 1000;

      if (isPaused.current || !controlsRef.current || !cameraRef.current) {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        prevTime.current = time - delta * 1000;
        return;
      }

      const player = controlsRef.current.getObject();
      const currentEyeOffset = isCrouching.current ? PLAYER_CROUCH_HEIGHT : PLAYER_NORMAL_HEIGHT;


      if (onGround.current) {
        let stillSupported = false;
        const playerFeetY = player.position.y - currentEyeOffset;

        // Check if still on main ground
        if (Math.abs(playerFeetY - 0) < 0.01 && Math.abs(player.position.y - (playerLastSurfaceY.current + currentEyeOffset)) < 0.01) {
             stillSupported = true;
        } else { // Check if still on a building top
          for (const building of buildingsRef.current) {
            if (!building.geometry.parameters || building === ground) continue; // ground is plane, no height
            const geomParams = building.geometry.parameters as any;
            const buildingHeight = geomParams.height;
            const buildingBaseY = building.position.y - buildingHeight / 2;
            const buildingTopActualY = buildingBaseY + buildingHeight;

            const halfWidth = geomParams.width ? geomParams.width / 2 : (geomParams.radiusTop || 0); // Handle Cylinder too
            const halfDepth = geomParams.depth ? geomParams.depth / 2 : (geomParams.radiusTop || 0); // Handle Cylinder too

            if (
              player.position.x >= building.position.x - halfWidth && player.position.x <= building.position.x + halfWidth &&
              player.position.z >= building.position.z - halfDepth && player.position.z <= building.position.z + halfDepth &&
              Math.abs(playerFeetY - buildingTopActualY) < 0.01 &&
              Math.abs(player.position.y - (playerLastSurfaceY.current + currentEyeOffset)) < 0.01
            ) {
              stillSupported = true;
              break;
            }
          }
        }
        if (!stillSupported) {
          onGround.current = false;
          jumpsMadeInAirRef.current = 0; // Reset air jumps if slid off an edge
        }
      }
      
      // If player is on ground, ensure their Y position is correctly clamped and vertical velocity is zero.
      if (onGround.current) {
        player.position.y = playerLastSurfaceY.current + currentEyeOffset;
        verticalVelocity.current = 0;
      }


      if (!onGround.current) {
        const previousPlayerY = player.position.y;
        verticalVelocity.current -= GRAVITY * delta;
        player.position.y += verticalVelocity.current * delta;

        let landedOnObject = false;
        if (verticalVelocity.current <= 0) { // Only check for landing if moving downwards
          for (const building of buildingsRef.current) {
            if (!building.geometry.parameters || building === ground) continue;
            const geomParams = building.geometry.parameters as any;
            const buildingHeight = geomParams.height;
            const buildingBaseY = building.position.y - buildingHeight / 2;
            const buildingTopActualY = buildingBaseY + buildingHeight;

            const halfWidth = geomParams.width ? geomParams.width / 2 : (geomParams.radiusTop || 0);
            const halfDepth = geomParams.depth ? geomParams.depth / 2 : (geomParams.radiusTop || 0);

            const playerCurrentFeetY = player.position.y - currentEyeOffset;
            const playerPreviousFeetY = previousPlayerY - currentEyeOffset;

            if (
              player.position.x >= building.position.x - halfWidth && player.position.x <= building.position.x + halfWidth &&
              player.position.z >= building.position.z - halfDepth && player.position.z <= building.position.z + halfDepth &&
              playerPreviousFeetY >= buildingTopActualY - 0.01 && // Was above or at the surface in the previous frame
              playerCurrentFeetY <= buildingTopActualY + 0.05 // Is at or slightly below surface now
            ) {
              player.position.y = buildingTopActualY + currentEyeOffset;
              verticalVelocity.current = 0;
              onGround.current = true;
              jumpsMadeInAirRef.current = 0;
              landedOnObject = true;
              playerLastSurfaceY.current = buildingTopActualY;
              break;
            }
          }

          // Check for landing on main ground
          const targetPlayerYOnMainGround = currentEyeOffset;
          if (!landedOnObject && player.position.y <= targetPlayerYOnMainGround ) {
             if (previousPlayerY >= targetPlayerYOnMainGround && player.position.y <= targetPlayerYOnMainGround + 0.05) {
                player.position.y = targetPlayerYOnMainGround;
                verticalVelocity.current = 0;
                onGround.current = true;
                jumpsMadeInAirRef.current = 0;
                playerLastSurfaceY.current = 0;
             }
          }
        }
      }

      // Movement logic, only apply if pointer is locked (desktop)
      if (controlsRef.current.isLocked === true) {
        velocity.current.x -= velocity.current.x * 10.0 * delta;
        velocity.current.z -= velocity.current.z * 10.0 * delta;

        direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
        direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
        direction.current.normalize();

        let currentMoveSpeed = PLAYER_SPEED;
        if (isRunning.current && !isCrouching.current && onGround.current) {
            currentMoveSpeed *= PLAYER_RUN_MULTIPLIER;
        } else if (isCrouching.current && onGround.current) {
            currentMoveSpeed *= PLAYER_CROUCH_SPEED_MULTIPLIER;
        }

        if (moveForward.current || moveBackward.current) velocity.current.z -= direction.current.z * currentMoveSpeed * 10.0 * delta;
        if (moveLeft.current || moveRight.current) velocity.current.x -= direction.current.x * currentMoveSpeed * 10.0 * delta;

        const originalPlayerPosition = player.position.clone();
        const playerEyeHeightForCollision = currentEyeOffset;

        const strafeAmount = -velocity.current.x * delta;
        if (Math.abs(strafeAmount) > 0.0001) {
            controlsRef.current.moveRight(strafeAmount);
            if (checkCollisionWithObjects(player, buildingsRef.current, PLAYER_COLLISION_RADIUS, playerEyeHeightForCollision)) {
                player.position.x = originalPlayerPosition.x;
                player.position.z = originalPlayerPosition.z;
            }
        }

        const positionAfterStrafe = player.position.clone();

        const forwardAmount = -velocity.current.z * delta;
        if (Math.abs(forwardAmount) > 0.0001) {
            controlsRef.current.moveForward(forwardAmount);
            if (checkCollisionWithObjects(player, buildingsRef.current, PLAYER_COLLISION_RADIUS, playerEyeHeightForCollision)) {
                player.position.x = positionAfterStrafe.x;
                player.position.z = positionAfterStrafe.z;
            }
        }

        const halfGroundMinusRadius = GROUND_SIZE / 2 - PLAYER_COLLISION_RADIUS;
        player.position.x = Math.max(-halfGroundMinusRadius, Math.min(halfGroundMinusRadius, player.position.x));
        player.position.z = Math.max(-halfGroundMinusRadius, Math.min(halfGroundMinusRadius, player.position.z));

      }
      prevTime.current = time;
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const cycleIntervalId = setInterval(() => {
      if (isPaused.current) return;

      setDayNightCycle(prev => {
        const newTime = (prev.currentTime + 1) % dayNightCycleConfig.cycleDuration;
        let accumulatedDuration = 0;
        let currentPhaseIndex = 0;
        let nextPhaseIndex = 0;
        let segmentProgress = 0;

        for (let i = 0; i < dayNightCycleConfig.phases.length; i++) {
          const phase = dayNightCycleConfig.phases[i];
          const phaseActualDuration = phase.duration * dayNightCycleConfig.cycleDuration;
          if (newTime < accumulatedDuration + phaseActualDuration) {
            currentPhaseIndex = i;
            nextPhaseIndex = (i + 1) % dayNightCycleConfig.phases.length;
            segmentProgress = (newTime - accumulatedDuration) / phaseActualDuration;
            break;
          }
          accumulatedDuration += phaseActualDuration;
        }

        segmentProgress = Math.max(0, Math.min(1, segmentProgress));


        const currentPhase = dayNightCycleConfig.phases[currentPhaseIndex];
        const nextPhase = dayNightCycleConfig.phases[nextPhaseIndex];

        const newDetails = {
          ambientColor: getInterpolatedColor(new THREE.Color(currentPhase.ambient[0]), new THREE.Color(nextPhase.ambient[0]), segmentProgress),
          ambientIntensity: getInterpolatedFloat(currentPhase.ambient[1], nextPhase.ambient[1], segmentProgress),
          directionalColor: getInterpolatedColor(new THREE.Color(currentPhase.directional[0]), new THREE.Color(nextPhase.directional[0]), segmentProgress),
          directionalIntensity: getInterpolatedFloat(currentPhase.directional[1], nextPhase.directional[1], segmentProgress),
          backgroundColor: getInterpolatedColor(new THREE.Color(currentPhase.background), new THREE.Color(nextPhase.background), segmentProgress),
          fogColor: getInterpolatedColor(new THREE.Color(currentPhase.fog), new THREE.Color(nextPhase.fog), segmentProgress),
        };
        return { currentTime: newTime, currentPhaseDetails: newDetails };
      });
    }, 1000);


    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(cycleIntervalId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);

      const currentBlocker = document.getElementById('blocker');
      if (currentBlocker) {
        currentBlocker.removeEventListener('click', clickToLockHandler);
      }

      if (controlsRef.current) {
        controlsRef.current.removeEventListener('lock', onLockHandler);
        controlsRef.current.removeEventListener('unlock', onUnlockHandler);
        if (controlsRef.current.isLocked) {
          controlsRef.current.unlock(); // Ensure unlock before dispose
        }
        controlsRef.current.dispose();
      }

      allTextures.forEach(texture => { if (texture) texture.dispose() });
      placeholderBottomMaterial.dispose();
      residentialMaterials.forEach(material => material.dispose());
      commercialMaterials.forEach(material => material.dispose());
      industrialMaterials.forEach(material => material.dispose());
      downtownMaterials.forEach(material => material.dispose());
      smokestackMaterial.dispose();
      boundaryWallMaterial.dispose();
      texturedGroundMaterial.dispose();

      if (rendererRef.current) {
         rendererRef.current.dispose();
         if (sceneRef.current) {
             sceneRef.current.traverse(object => {
                if (object instanceof THREE.Mesh) {
                    if (object.geometry) object.geometry.dispose();
                }
             });
             buildingsRef.current.forEach(building => {
                if(building.geometry) building.geometry.dispose();
             });
             buildingsRef.current = [];
         }
      }

      if (mountRef.current && rendererRef.current?.domElement && currentMount.contains(rendererRef.current.domElement)) {
           currentMount.removeChild(rendererRef.current.domElement);
      }

      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      ambientLightRef.current = null;
      directionalLightRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onKeyDown, onKeyUp, clickToLockHandler, onLockHandler, onUnlockHandler]);

  useEffect(() => {
    if (sceneRef.current && ambientLightRef.current && directionalLightRef.current) {
      sceneRef.current.background = dayNightCycle.currentPhaseDetails.backgroundColor;
      sceneRef.current.fog = new THREE.Fog(dayNightCycle.currentPhaseDetails.fogColor, GROUND_SIZE / 6, GROUND_SIZE * 0.75);
      ambientLightRef.current.color = dayNightCycle.currentPhaseDetails.ambientColor;
      ambientLightRef.current.intensity = dayNightCycle.currentPhaseDetails.ambientIntensity;
      directionalLightRef.current.color = dayNightCycle.currentPhaseDetails.directionalColor;
      directionalLightRef.current.intensity = dayNightCycle.currentPhaseDetails.directionalIntensity;
    }
  }, [dayNightCycle]);


  return <div ref={mountRef} className="w-full h-full cursor-grab focus:cursor-grabbing" tabIndex={-1} />;
}
