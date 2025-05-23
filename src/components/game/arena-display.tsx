
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
    MAX_AIR_JUMPS,
    PLAYER_PUNCH_DAMAGE,
    PLAYER_KICK_DAMAGE,
    GUN1_DAMAGE,
    GUN2_DAMAGE,
    SWORD_DAMAGE,
    POWERUP_COLLECTION_DISTANCE,
    POWERUP_GLOW_INTENSITY,
    PLAYER_MAX_HEALTH,
    INVINCIBILITY_DURATION,
} from '@/config/game-constants';
import { usePlayerHealth } from '@/contexts/player-health-context';

interface DayNightPhase {
  name: string;
  duration: number;
  ambient: [number, number];
  directional: [number, number];
  background: number;
  fog: number;
}

const dayNightCycleConfig = {
  cycleDuration: 120, // Total cycle in seconds
  phases: [
    { name: 'Day', duration: 0.4, ambient: [0xffffff, 2.5], directional: [0xffffff, 3.0], background: 0x88ccff, fog: 0x88ccff },
    { name: 'Dusk', duration: 0.15, ambient: [0xffaa77, 0.3], directional: [0xffaa77, 0.4], background: 0x403050, fog: 0x403050 },
    { name: 'Night', duration: 0.3, ambient: [0x0a0a1a, 0.005], directional: [0x101020, 0.01], background: 0x000005, fog: 0x000005 },
    { name: 'Dawn', duration: 0.15, ambient: [0x88aabb, 0.2], directional: [0x88aabb, 0.3], background: 0x304060, fog: 0x304060 },
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

type PowerUpType = 'gun1' | 'gun2' | 'sword' | 'health' | 'invincibility';
interface WorldPowerUp {
    mesh: THREE.Mesh; 
    type: PowerUpType;
    id: string; 
    collected: boolean;
}

interface HandheldWeapons {
    sword: THREE.Mesh | null;
    gun1: THREE.Mesh | null;
    gun2: THREE.Mesh | null;
}

const ATTACK_ANIMATION_DURATION = 0.2; // seconds

function getInterpolatedColor(color1: THREE.Color, color2: THREE.Color, factor: number): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, factor);
}

function getInterpolatedFloat(val1: number, val2: number, factor: number): number {
  return val1 + (val2 - val1) * factor;
}

const PLAYER_COLLISION_RADIUS = 0.4;

function checkCollisionWithObjects(
    playerObject: THREE.Object3D, 
    obstacleMeshes: THREE.Mesh[],
    radius: number,
    playerPhysicsEyeHeight: number 
): boolean {
    const playerXZPos = playerObject.position;

    const playerColliderBox = new THREE.Box3(
        new THREE.Vector3(playerXZPos.x - radius, playerObject.position.y - playerPhysicsEyeHeight, playerXZPos.z - radius),
        new THREE.Vector3(playerXZPos.x + radius, playerObject.position.y + 0.1, playerXZPos.z + radius) // Small height for the box
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
  const isTorchOnRef = useRef(false);
  
  const isPunchingRef = useRef(false);
  const isKickingRef = useRef(false);
  const equippedWeaponRef = useRef<PowerUpType | null>(null); 
  const worldPowerUpsRef = useRef<WorldPowerUp[]>([]);
  const handheldWeaponsRef = useRef<HandheldWeapons>({ sword: null, gun1: null, gun2: null });
  
  const isAnimatingAttackRef = useRef(false);
  const attackAnimStartTimeRef = useRef(0);

  const { setCurrentHealth, setInvincibilityActive } = usePlayerHealth();
  const playerHealthRef = useRef(PLAYER_MAX_HEALTH);
  const isInvincibleRef = useRef(false);
  const invincibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  const direction = useRef(new THREE.Vector3());
  const prevTime = useRef(performance.now());
  const isPaused = useRef(false);

  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);
  const spotLightRef = useRef<THREE.SpotLight | null>(null);
  const spotLightTargetRef = useRef<THREE.Object3D | null>(null);
  const buildingsRef = useRef<THREE.Mesh[]>([]);
  const playerLastSurfaceY = useRef(0);


  const [dayNightCycle, setDayNightCycle] = useState<DayNightCycleState>(() => {
    const initialPhase = dayNightCycleConfig.phases[0];
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

  const takePlayerDamage = useCallback((amount: number) => {
    if (isInvincibleRef.current) {
        console.log("Player is invincible, no damage taken.");
        return; 
    }
    if (!playerHealthRef.current) return;
    
    let newHealth = playerHealthRef.current - amount;
    if (newHealth < 0) {
      newHealth = 0;
      // TODO: Implement game over logic
    }
    playerHealthRef.current = newHealth;
    setCurrentHealth(newHealth); 
    console.log(`Player took ${amount} damage. Current health: ${playerHealthRef.current}`);
  }, [setCurrentHealth]);

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
      case 'KeyF':
        if (!isPaused.current && controlsRef.current?.isLocked && spotLightRef.current) {
            isTorchOnRef.current = !isTorchOnRef.current;
            spotLightRef.current.visible = isTorchOnRef.current;
        }
        break;
      case 'KeyL': 
        if (!isPaused.current && controlsRef.current?.isLocked) {
            takePlayerDamage(10);
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
        } else {
          if (pausedMessageEl) pausedMessageEl.style.display = 'none';
          if (blockerEl) {
            if (controlsRef.current && !controlsRef.current.isLocked) {
              blockerEl.style.display = 'grid';
              if (instructionsEl) instructionsEl.style.display = '';
            } else {
              blockerEl.style.display = 'none';
              if (instructionsEl) instructionsEl.style.display = 'none';
            }
          }
        }
        break;
      }
    }
  }, [takePlayerDamage]); 

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

  const onMouseDown = useCallback((event: MouseEvent) => {
    if (controlsRef.current?.isLocked && !isPaused.current && !isAnimatingAttackRef.current) {
      isAnimatingAttackRef.current = true;
      attackAnimStartTimeRef.current = performance.now();

      switch (event.button) {
        case 0: // Left mouse button
          isPunchingRef.current = true; 
          setTimeout(() => { isPunchingRef.current = false; }, 100);

          if (equippedWeaponRef.current === 'gun1') {
            console.log("Player Action: Shoot Gun 1 - Damage:", GUN1_DAMAGE);
          } else if (equippedWeaponRef.current === 'gun2') {
            console.log("Player Action: Shoot Gun 2 - Damage:", GUN2_DAMAGE);
          } else if (equippedWeaponRef.current === 'sword') {
            console.log("Player Action: Swing Sword - Damage:", SWORD_DAMAGE);
          } else { 
            console.log("Player Action: Punch - Damage:", PLAYER_PUNCH_DAMAGE);
          }
          break;
        case 2: // Right mouse button
          isKickingRef.current = true; 
          setTimeout(() => isKickingRef.current = false, 100);
          console.log("Player Action: Kick - Damage:", PLAYER_KICK_DAMAGE);
          isAnimatingAttackRef.current = false; 
          break;
        default:
            isAnimatingAttackRef.current = false;
            break;
      }
    }
  }, []);

  const positionWeaponInHand = (weaponMesh: THREE.Mesh, type: PowerUpType) => {
    if (!cameraRef.current) return;
    if (type === 'sword') {
        weaponMesh.position.set(0.35, -0.3, -0.5); 
        weaponMesh.rotation.set(0, -Math.PI / 2 - 0.2, 0); 
    } else if (type === 'gun1' || type === 'gun2') {
        weaponMesh.position.set(0.3, -0.25, -0.4); 
        weaponMesh.rotation.set(0, -Math.PI / 2, 0); 
    }
  };

  const clickToLockHandler = useCallback(() => {
    const instructionsEl = document.getElementById('instructions');
    const blockerEl = document.getElementById('blocker');
    const pausedMessageEl = document.getElementById('paused-message');

    if (!isPaused.current && controlsRef.current && !controlsRef.current.isLocked) {
      if (rendererRef.current && rendererRef.current.domElement) {
          rendererRef.current.domElement.focus(); 
      }
      if (typeof controlsRef.current.domElement.requestPointerLock === 'function') {
        controlsRef.current.lock();
      } else {
        console.error('ArenaDisplay: requestPointerLock API is not a function on domElement. Pointer lock cannot be initiated.');
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
    camera.position.set(0, PLAYER_NORMAL_HEIGHT, 5); 
    playerLastSurfaceY.current = 0; 
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.tabIndex = -1; 
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    rendererRef.current.domElement.focus();


    const controls = new PointerLockControls(camera, renderer.domElement);
    controls.pointerSpeed = PLAYER_SENSITIVITY / 0.002; 
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

    if (currentMount) {
      if (controlsRef.current && !controlsRef.current.isLocked ) { 
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

    spotLightRef.current = new THREE.SpotLight(0xffffff, 1.5, 70, Math.PI / 7, 0.3, 1.5);
    spotLightRef.current.visible = false; 
    spotLightRef.current.position.set(0, 0, 0); 
    camera.add(spotLightRef.current); 

    spotLightTargetRef.current = new THREE.Object3D();
    spotLightTargetRef.current.position.set(0, 0, -1); 
    camera.add(spotLightTargetRef.current);
    spotLightRef.current.target = spotLightTargetRef.current;

    const textureLoader = new THREE.TextureLoader();
    const textureLoadError = (textureName: string) => (event: ErrorEvent | Event) => {
      let errorMessage = `ArenaDisplay: Texture loading failed for '${textureName}'. Attempted path: /textures/${textureName}.`;
      if (event && event instanceof ErrorEvent && event.message) {
        errorMessage += ` Details: ${event.message}`;
      } else if (event && event.target instanceof Image) {
        errorMessage += ` Image load error on target. src: ${(event.target as HTMLImageElement).src}`;
      } else {
        errorMessage += ` An unknown error occurred during texture loading.`;
      }
      console.error(errorMessage, event);
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

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE), texturedGroundMaterial);
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

    const addBuilding = (geometry: THREE.BufferGeometry, materials: THREE.Material | THREE.Material[], x: number, yBase: number, z: number) => {
      const buildingHeightParam = (geometry.parameters as any).height;
      const building = new THREE.Mesh(geometry, materials);
      building.position.set(x, yBase + buildingHeightParam / 2, z); 
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);
      buildingsRef.current.push(building); 
    };

    const obstacleMaterials = [residentialMaterials, commercialMaterials, industrialMaterials, downtownMaterials];
    const numBaseBuildings = 30; 
    for (let i = 0; i < numBaseBuildings; i++) {
        const sizeX = THREE.MathUtils.randFloat(2, 6);
        const sizeY = THREE.MathUtils.randFloat(1.5, 8); 
        const sizeZ = THREE.MathUtils.randFloat(2, 6);
        const posX = (Math.random() - 0.5) * (GROUND_SIZE - sizeX - 4); 
        const posZ = (Math.random() - 0.5) * (GROUND_SIZE - sizeZ - 4);
        const matIndex = Math.floor(Math.random() * obstacleMaterials.length);
        addBuilding(new THREE.BoxGeometry(sizeX, sizeY, sizeZ), obstacleMaterials[matIndex], posX, 0, posZ);
    }
    addBuilding(new THREE.CylinderGeometry(0.5, 0.5, 10, 16), smokestackMaterial, (Math.random() - 0.5) * GROUND_SIZE * 0.6, 0, (Math.random() - 0.5) * GROUND_SIZE * 0.6);
    addBuilding(new THREE.BoxGeometry(6, 25, 6), downtownMaterials, (Math.random() - 0.5) * GROUND_SIZE * 0.3, 0, (Math.random() - 0.5) * GROUND_SIZE * 0.3);

    const swordHandGeo = new THREE.BoxGeometry(0.1, 1.0, 0.05); 
    const swordHandMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.8 });
    handheldWeaponsRef.current.sword = new THREE.Mesh(swordHandGeo, swordHandMat);
    handheldWeaponsRef.current.sword.visible = false; 

    const gunHandGeo = new THREE.BoxGeometry(0.15, 0.15, 0.3); 
    const gun1HandMat = new THREE.MeshStandardMaterial({ color: 0x3333ff, roughness: 0.5, metalness: 0.5 });
    handheldWeaponsRef.current.gun1 = new THREE.Mesh(gunHandGeo, gun1HandMat);
    handheldWeaponsRef.current.gun1.visible = false;
    
    const gun2HandMat = new THREE.MeshStandardMaterial({ color: 0x33ff33, roughness: 0.5, metalness: 0.5 });
    handheldWeaponsRef.current.gun2 = new THREE.Mesh(gunHandGeo, gun2HandMat);
    handheldWeaponsRef.current.gun2.visible = false;

    const powerUpY = 0.5; 
    const powerUpDefinitions: { type: PowerUpType; color: number; size: [number, number, number] }[] = [
        { type: 'gun1', color: 0x0000ff, size: [0.5, 0.5, 0.5] }, 
        { type: 'gun2', color: 0x00ff00, size: [0.5, 0.5, 0.5] }, 
        { type: 'sword', color: 0x808080, size: [0.2, 1.5, 0.2] }, 
        { type: 'health', color: 0xff00ff, size: [0.6, 0.6, 0.6] },
        { type: 'invincibility', color: 0xffff00, size: [0.7, 0.7, 0.7] },
    ];

    const numPowerUps = powerUpDefinitions.length;
    const zoneWidth = GROUND_SIZE / numPowerUps;
    const halfGround = GROUND_SIZE / 2;
    worldPowerUpsRef.current = []; 

    powerUpDefinitions.forEach((def, index) => {
        const zoneStartX = -halfGround + index * zoneWidth;
        const zoneEndX = zoneStartX + zoneWidth;

        const x = THREE.MathUtils.randFloat(zoneStartX + 2, zoneEndX - 2); 
        const z = THREE.MathUtils.randFloat(-halfGround + 2, halfGround - 2); 

        const geometry = new THREE.BoxGeometry(...def.size as [number, number, number]);
        const material = new THREE.MeshStandardMaterial({ 
            color: def.color, 
            roughness: 0.5, 
            metalness: 0.5,
            emissive: def.color, 
            emissiveIntensity: POWERUP_GLOW_INTENSITY 
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, powerUpY + def.size[1] / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        worldPowerUpsRef.current.push({ mesh, type: def.type, id: `powerup-${def.type}-${index}`, collected: false });
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);

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
      const physicsEyeOffset = isCrouching.current ? PLAYER_CROUCH_HEIGHT : PLAYER_NORMAL_HEIGHT;
      let visualEyeOffset = physicsEyeOffset; 

      if (isPunchingRef.current || isKickingRef.current) { 
        visualEyeOffset -= 0.05; 
      }

      if (onGround.current) {
        player.position.y = playerLastSurfaceY.current + visualEyeOffset; 
        verticalVelocity.current = 0; 
        
        let currentlyOverSupport = false;
        const playerCurrentFeetYForCheck = player.position.y - visualEyeOffset; 

        if (Math.abs(playerCurrentFeetYForCheck - playerLastSurfaceY.current) < 0.01) { 
             if (playerLastSurfaceY.current === 0) { 
                if (player.position.x >= -GROUND_SIZE/2 && player.position.x <= GROUND_SIZE/2 &&
                    player.position.z >= -GROUND_SIZE/2 && player.position.z <= GROUND_SIZE/2) {
                    currentlyOverSupport = true;
                }
             } else { 
                for (const building of buildingsRef.current) {
                    if (!building.geometry.parameters || building === ground) continue;
                    const geomParams = building.geometry.parameters as any;
                    const buildingHeight = geomParams.height;
                    const buildingBaseY = building.position.y - buildingHeight / 2;
                    const buildingTopActualY = buildingBaseY + buildingHeight;

                    if (Math.abs(buildingTopActualY - playerLastSurfaceY.current) < 0.01) { 
                        const halfWidth = geomParams.width ? geomParams.width / 2 : (geomParams.radiusTop || geomParams.radiusBottom || 0);
                        const halfDepth = geomParams.depth ? geomParams.depth / 2 : (geomParams.radiusTop || geomParams.radiusBottom || 0);
                        if (player.position.x >= building.position.x - halfWidth && player.position.x <= building.position.x + halfWidth &&
                            player.position.z >= building.position.z - halfDepth && player.position.z <= building.position.z + halfDepth) {
                            currentlyOverSupport = true;
                            break;
                        }
                    }
                }
             }
        }
        
        if (!currentlyOverSupport) {
            if (Math.abs(playerCurrentFeetYForCheck - 0) < 0.01 && 
                player.position.x >= -GROUND_SIZE/2 && player.position.x <= GROUND_SIZE/2 &&
                player.position.z >= -GROUND_SIZE/2 && player.position.z <= GROUND_SIZE/2) {
                currentlyOverSupport = true;
                if (playerLastSurfaceY.current !== 0) playerLastSurfaceY.current = 0; 
            } else {
                for (const building of buildingsRef.current) {
                    if (!building.geometry.parameters || building === ground) continue;
                    const geomParams = building.geometry.parameters as any;
                    const buildingHeight = geomParams.height;
                    const buildingBaseY = building.position.y - buildingHeight / 2;
                    const buildingTopActualY = buildingBaseY + buildingHeight;

                    const halfWidth = geomParams.width ? geomParams.width / 2 : (geomParams.radiusTop || geomParams.radiusBottom || 0);
                    const halfDepth = geomParams.depth ? geomParams.depth / 2 : (geomParams.radiusTop || geomParams.radiusBottom || 0);

                    if (
                        player.position.x >= building.position.x - halfWidth && player.position.x <= building.position.x + halfWidth &&
                        player.position.z >= building.position.z - halfDepth && player.position.z <= building.position.z + halfDepth &&
                        Math.abs(playerCurrentFeetYForCheck - buildingTopActualY) < 0.05 
                    ) {
                        currentlyOverSupport = true;
                        if (playerLastSurfaceY.current !== buildingTopActualY) playerLastSurfaceY.current = buildingTopActualY; 
                        break;
                    }
                }
            }
        }

        if (!currentlyOverSupport) { 
            onGround.current = false;
            jumpsMadeInAirRef.current = 0; 
        } else {
            player.position.y = playerLastSurfaceY.current + visualEyeOffset; 
        }
      }

      if (!onGround.current) {
        const previousPlayerY = player.position.y;
        verticalVelocity.current -= GRAVITY * delta;
        player.position.y += verticalVelocity.current * delta;

        let landedOnObject = false;
        if (verticalVelocity.current <= 0) { 
          for (const building of buildingsRef.current) {
            if (!building.geometry.parameters || building === ground) continue; 
            const geomParams = building.geometry.parameters as any;
            const buildingHeightParam = geomParams.height;
            const buildingBaseY = building.position.y - buildingHeightParam / 2;
            const buildingTopActualY = buildingBaseY + buildingHeightParam;

            const halfWidth = geomParams.width ? geomParams.width / 2 : (geomParams.radiusTop || geomParams.radiusBottom || 0);
            const halfDepth = geomParams.depth ? geomParams.depth / 2 : (geomParams.radiusTop || geomParams.radiusBottom || 0);

            const playerCurrentFeetY = player.position.y - physicsEyeOffset; 
            const playerPreviousFeetY = previousPlayerY - physicsEyeOffset;

            if (
              player.position.x >= building.position.x - halfWidth && player.position.x <= building.position.x + halfWidth &&
              player.position.z >= building.position.z - halfDepth && player.position.z <= building.position.z + halfDepth &&
              playerPreviousFeetY >= buildingTopActualY - 0.01 && 
              playerCurrentFeetY <= buildingTopActualY + 0.05 
            ) {
              player.position.y = buildingTopActualY + visualEyeOffset; 
              verticalVelocity.current = 0;
              onGround.current = true;
              jumpsMadeInAirRef.current = 0;
              landedOnObject = true;
              playerLastSurfaceY.current = buildingTopActualY; 
              break;
            }
          }

          const mainGroundTargetYVisual = visualEyeOffset; 
          if (!landedOnObject && player.position.y <= mainGroundTargetYVisual ) {
             const currentFeetY = player.position.y - visualEyeOffset; 
             const previousFeetY = previousPlayerY - visualEyeOffset; 

             if (previousFeetY >= 0 && currentFeetY <= 0 + 0.05) { 
                player.position.y = mainGroundTargetYVisual;
                verticalVelocity.current = 0;
                onGround.current = true;
                jumpsMadeInAirRef.current = 0;
                playerLastSurfaceY.current = 0; 
             } else if (player.position.y < mainGroundTargetYVisual) { 
                player.position.y = mainGroundTargetYVisual;
                verticalVelocity.current = 0;
                onGround.current = true;
                jumpsMadeInAirRef.current = 0;
                playerLastSurfaceY.current = 0;
             }
          }
        }
      }

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
        const playerEyeHeightForCollision = physicsEyeOffset; 

        const strafeAmount = -velocity.current.x * delta;
        if (Math.abs(strafeAmount) > 0.0001) { 
            controlsRef.current.moveRight(strafeAmount);
            if (checkCollisionWithObjects(player, buildingsRef.current, PLAYER_COLLISION_RADIUS, playerEyeHeightForCollision)) {
                player.position.x = originalPlayerPosition.x; 
            }
        }
        const positionAfterStrafe = player.position.clone(); 
        const forwardAmount = -velocity.current.z * delta;
        if (Math.abs(forwardAmount) > 0.0001) { 
            controlsRef.current.moveForward(forwardAmount);
            if (checkCollisionWithObjects(player, buildingsRef.current, PLAYER_COLLISION_RADIUS, playerEyeHeightForCollision)) {
                player.position.z = positionAfterStrafe.z; 
            }
        }
        
        const halfGroundMinusRadius = GROUND_SIZE / 2 - PLAYER_COLLISION_RADIUS;
        player.position.x = Math.max(-halfGroundMinusRadius, Math.min(halfGroundMinusRadius, player.position.x));
        player.position.z = Math.max(-halfGroundMinusRadius, Math.min(halfGroundMinusRadius, player.position.z));

        const playerPos = player.position;
        for (let i = worldPowerUpsRef.current.length - 1; i >= 0; i--) {
            const powerUp = worldPowerUpsRef.current[i];
            if (!powerUp.collected && powerUp.mesh.parent === sceneRef.current) { 
                const distanceToPowerUp = playerPos.distanceTo(powerUp.mesh.position);
                if (distanceToPowerUp < POWERUP_COLLECTION_DISTANCE) {
                    console.log(`Collected ${powerUp.type}`);
                    powerUp.collected = true;
                    if (sceneRef.current && powerUp.mesh.parent) sceneRef.current.remove(powerUp.mesh); 

                    if (powerUp.type === 'health') {
                        setCurrentHealth(PLAYER_MAX_HEALTH);
                        playerHealthRef.current = PLAYER_MAX_HEALTH;
                        console.log("Player health restored to maximum!");
                    } else if (powerUp.type === 'invincibility') {
                        isInvincibleRef.current = true;
                        setInvincibilityActive(INVINCIBILITY_DURATION); // Notify context
                        console.log(`Player is INVINCIBLE for ${INVINCIBILITY_DURATION} seconds!`);
                        if (invincibilityTimeoutRef.current) {
                            clearTimeout(invincibilityTimeoutRef.current);
                        }
                        invincibilityTimeoutRef.current = setTimeout(() => {
                            isInvincibleRef.current = false;
                            console.log("Invincibility WORE OFF!");
                            // No need to call clearInvincibility here, context timer handles display
                        }, INVINCIBILITY_DURATION * 1000);
                    } else { 
                        if (equippedWeaponRef.current && handheldWeaponsRef.current[equippedWeaponRef.current as Exclude<PowerUpType, 'health' | 'invincibility'>]) {
                            const oldWeaponMesh = handheldWeaponsRef.current[equippedWeaponRef.current as Exclude<PowerUpType, 'health' | 'invincibility'>];
                            if (oldWeaponMesh && oldWeaponMesh.parent === cameraRef.current) {
                                cameraRef.current?.remove(oldWeaponMesh);
                                oldWeaponMesh.visible = false;
                            }
                        }
                        
                        equippedWeaponRef.current = powerUp.type;
                        const newWeaponMesh = handheldWeaponsRef.current[powerUp.type as Exclude<PowerUpType, 'health' | 'invincibility'>];
                        if (newWeaponMesh && cameraRef.current) {
                            cameraRef.current.add(newWeaponMesh);
                            newWeaponMesh.visible = true;
                            positionWeaponInHand(newWeaponMesh, powerUp.type);
                        }
                    }
                    break; 
                }
            }
        }

        if (isAnimatingAttackRef.current) {
            const currentTime = performance.now();
            const animProgress = (currentTime - attackAnimStartTimeRef.current) / (ATTACK_ANIMATION_DURATION * 1000);

            const weaponMesh = equippedWeaponRef.current && equippedWeaponRef.current !== 'health' && equippedWeaponRef.current !== 'invincibility' 
                ? handheldWeaponsRef.current[equippedWeaponRef.current as Exclude<PowerUpType, 'health' | 'invincibility'>] 
                : null;

            if (weaponMesh && weaponMesh.visible) { 
                if (animProgress < 1) {
                    if (equippedWeaponRef.current === 'sword') {
                        const swingAngle = Math.sin(animProgress * Math.PI) * (Math.PI / 3); 
                        weaponMesh.rotation.z = swingAngle; 
                    } else if (equippedWeaponRef.current === 'gun1' || equippedWeaponRef.current === 'gun2') {
                        const recoilAmount = Math.sin(animProgress * Math.PI) * 0.1; 
                        weaponMesh.position.z = -0.4 - recoilAmount; 
                    }
                } else {
                    isAnimatingAttackRef.current = false;
                    if (equippedWeaponRef.current && weaponMesh && (equippedWeaponRef.current !== 'health' && equippedWeaponRef.current !== 'invincibility') ) { 
                         positionWeaponInHand(weaponMesh, equippedWeaponRef.current); 
                    }
                }
            } else {
                 if (animProgress >= 1) isAnimatingAttackRef.current = false;
                 if (!isAnimatingAttackRef.current && isPunchingRef.current){ 
                 }
            }
        } else if (isPunchingRef.current && !equippedWeaponRef.current) { 
            const currentTime = performance.now();
             if ((currentTime - attackAnimStartTimeRef.current) / 1000 > 0.1) { 
                isAnimatingAttackRef.current = false;
             }
        }


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
      if (invincibilityTimeoutRef.current) {
        clearTimeout(invincibilityTimeoutRef.current);
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousedown', onMouseDown);

      const currentBlocker = document.getElementById('blocker');
      if (currentBlocker) {
        currentBlocker.removeEventListener('click', clickToLockHandler);
      }

      if (controlsRef.current) {
        controlsRef.current.removeEventListener('lock', onLockHandler);
        controlsRef.current.removeEventListener('unlock', onUnlockHandler);
        if (controlsRef.current.isLocked) {
          controlsRef.current.unlock();
        }
        controlsRef.current.dispose();
      }

      if (spotLightRef.current) {
        if(spotLightRef.current.shadow && spotLightRef.current.shadow.map) {
            spotLightRef.current.shadow.map.dispose(); 
        }
      }

      allTextures.forEach(texture => { if (texture) texture.dispose(); });
      placeholderBottomMaterial.dispose();
      residentialMaterials.forEach(material => material.dispose());
      commercialMaterials.forEach(material => material.dispose());
      industrialMaterials.forEach(material => material.dispose());
      downtownMaterials.forEach(material => material.dispose());
      smokestackMaterial.dispose();
      boundaryWallMaterial.dispose();
      texturedGroundMaterial.dispose();

      Object.values(handheldWeaponsRef.current).forEach(weaponMesh => {
        if (weaponMesh) {
            if (weaponMesh.geometry) weaponMesh.geometry.dispose();
            if (weaponMesh.material) {
                if (Array.isArray(weaponMesh.material)) weaponMesh.material.forEach(m => m.dispose());
                else (weaponMesh.material as THREE.Material).dispose();
            }
            if (cameraRef.current && weaponMesh.parent === cameraRef.current) cameraRef.current.remove(weaponMesh);
        }
      });

      worldPowerUpsRef.current.forEach(powerUp => {
        if (powerUp.mesh.geometry) powerUp.mesh.geometry.dispose();
        if (powerUp.mesh.material) {
            if (Array.isArray(powerUp.mesh.material)) {
                powerUp.mesh.material.forEach(m => m.dispose());
            } else {
                (powerUp.mesh.material as THREE.Material).dispose();
            }
        }
        if(sceneRef.current && powerUp.mesh.parent) sceneRef.current.remove(powerUp.mesh); 
      });
      worldPowerUpsRef.current = [];


      if (rendererRef.current) {
         rendererRef.current.dispose(); 
         if (sceneRef.current) {
             sceneRef.current.traverse(object => {
                if (object instanceof THREE.Mesh) {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(m => m.dispose());
                        } else {
                           (object.material as THREE.Material).dispose();
                        }
                    }
                }
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
      spotLightRef.current = null;
      spotLightTargetRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCurrentHealth, setInvincibilityActive]); 

  useEffect(() => {
    if (sceneRef.current && ambientLightRef.current && directionalLightRef.current) {
      sceneRef.current.background = dayNightCycle.currentPhaseDetails.backgroundColor;
      if(sceneRef.current.fog) {
        (sceneRef.current.fog as THREE.Fog).color = dayNightCycle.currentPhaseDetails.fogColor;
      } else {
        sceneRef.current.fog = new THREE.Fog(dayNightCycle.currentPhaseDetails.fogColor, GROUND_SIZE / 6, GROUND_SIZE * 0.75);
      }
      ambientLightRef.current.color = dayNightCycle.currentPhaseDetails.ambientColor;
      ambientLightRef.current.intensity = dayNightCycle.currentPhaseDetails.ambientIntensity;
      directionalLightRef.current.color = dayNightCycle.currentPhaseDetails.directionalColor;
      directionalLightRef.current.intensity = dayNightCycle.currentPhaseDetails.directionalIntensity;
    }
  }, [dayNightCycle]);


  return <div ref={mountRef} className="w-full h-full cursor-grab focus:cursor-grabbing" tabIndex={-1} />;
}

