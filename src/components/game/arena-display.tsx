
"use client";

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { PLAYER_SPEED, PLAYER_SENSITIVITY, GROUND_SIZE } from '@/config/game-constants';

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
  const direction = useRef(new THREE.Vector3());
  const prevTime = useRef(performance.now());
  const isPaused = useRef(false);

  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);
  const gameTimeRef = useRef(0);
  const cycleDuration = 60 * 1000; // 60 seconds for a full cycle

  // Define color and intensity keyframes for the day/night cycle
  const dayColors = {
    ambient: new THREE.Color(0xffffff),
    directional: new THREE.Color(0xffffff),
    background: new THREE.Color(0x87CEEB), // Sky Blue
    fog: new THREE.Color(0x87CEEB),
  };
  const dayIntensities = { ambient: 0.7, directional: 1.2 };

  const duskColors = {
    ambient: new THREE.Color(0xFF8C00), // DarkOrange
    directional: new THREE.Color(0xFF4500), // OrangeRed
    background: new THREE.Color(0x4A345E), // Dark Purple/Orange
    fog: new THREE.Color(0x4A345E),
  };
  const duskIntensities = { ambient: 0.4, directional: 0.8 };

  const nightColors = {
    ambient: new THREE.Color(0x101020), // Dark Blue
    directional: new THREE.Color(0x202040), // Darker Blue (moonlight)
    background: new THREE.Color(0x00001A), // Very Dark Blue
    fog: new THREE.Color(0x00001A),
  };
  const nightIntensities = { ambient: 0.2, directional: 0.3 };

  const dawnColors = { // Similar to dusk, but can be different
    ambient: new THREE.Color(0xFFB6C1), // LightPink
    directional: new THREE.Color(0xFFA07A), // LightSalmon
    background: new THREE.Color(0x5E344A), // Dark Pink/Purple
    fog: new THREE.Color(0x5E344A),
  };
  const dawnIntensities = { ambient: 0.4, directional: 0.8 };


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
      case 'KeyP': {
        isPaused.current = !isPaused.current;
        const pausedMessageEl = document.getElementById('paused-message');
        const instructionsEl = document.getElementById('instructions');
        const blockerEl = document.getElementById('blocker');

        if (isPaused.current) {
          if (controlsRef.current?.isLocked) {
            controlsRef.current.unlock(); 
          } else {
            if (blockerEl) blockerEl.style.display = 'grid';
            if (pausedMessageEl) pausedMessageEl.style.display = 'block';
            if (instructionsEl) instructionsEl.style.display = 'none';
          }
        } else {
          if (pausedMessageEl) pausedMessageEl.style.display = 'none';
          if (instructionsEl) instructionsEl.style.display = ''; 
          if (blockerEl && !controlsRef.current?.isLocked) blockerEl.style.display = 'grid';
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
    }
  }, []);

  const clickToLockHandler = useCallback(() => {
    if (!isPaused.current) {
        controlsRef.current?.lock();
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
    scene.fog = new THREE.Fog(dayColors.fog, GROUND_SIZE / 6, GROUND_SIZE * 0.75);
    scene.background = dayColors.background.clone();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 5); 
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new PointerLockControls(camera, renderer.domElement);
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
    if (!controls.isLocked && currentMount) { 
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
    
    ambientLightRef.current = new THREE.AmbientLight(dayColors.ambient, dayIntensities.ambient);
    scene.add(ambientLightRef.current);

    directionalLightRef.current = new THREE.DirectionalLight(dayColors.directional, dayIntensities.directional);
    directionalLightRef.current.position.set(20, 30, 20);
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
    
    const groundGeometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8, metalness: 0.2 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const wallHeight = GROUND_SIZE ; 
    const wallThickness = 10; 
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x1A1A1D, roughness: 0.95, metalness: 0.1 }); 
    
    const wallN = new THREE.Mesh(new THREE.BoxGeometry(GROUND_SIZE + wallThickness * 2, wallHeight, wallThickness), wallMaterial);
    wallN.position.set(0, wallHeight/2, -GROUND_SIZE/2 - wallThickness/2);
    wallN.castShadow = true; wallN.receiveShadow = true; scene.add(wallN);
    
    const wallS = new THREE.Mesh(new THREE.BoxGeometry(GROUND_SIZE + wallThickness * 2, wallHeight, wallThickness), wallMaterial);
    wallS.position.set(0, wallHeight/2, GROUND_SIZE/2 + wallThickness/2);
    wallS.castShadow = true; wallS.receiveShadow = true; scene.add(wallS);

    const wallE = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, GROUND_SIZE), wallMaterial);
    wallE.position.set(GROUND_SIZE/2 + wallThickness/2, wallHeight/2, 0);
    wallE.castShadow = true; wallE.receiveShadow = true; scene.add(wallE);

    const wallW = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, GROUND_SIZE), wallMaterial);
    wallW.position.set(-GROUND_SIZE/2 - wallThickness/2, wallHeight/2, 0);
    wallW.castShadow = true; wallW.receiveShadow = true; scene.add(wallW);

    const residentialMaterial = new THREE.MeshStandardMaterial({ color: 0xA0A0A0, roughness: 0.8, metalness: 0.2 }); 
    const commercialMaterial = new THREE.MeshStandardMaterial({ color: 0x708090, roughness: 0.6, metalness: 0.4 }); 
    const industrialMaterial = new THREE.MeshStandardMaterial({ color: 0x4A4A4A, roughness: 0.9, metalness: 0.6 }); 
    const downtownMaterial = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.4, metalness: 0.7 }); 

    const buildingOffset = GROUND_SIZE / 4; 

    const house1 = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 5), residentialMaterial);
    house1.position.set(-buildingOffset, 1.5, -buildingOffset + 5);
    house1.castShadow = true; house1.receiveShadow = true; scene.add(house1);

    const house2 = new THREE.Mesh(new THREE.BoxGeometry(5, 2.5, 4), residentialMaterial);
    house2.position.set(-buildingOffset + 8, 1.25, -buildingOffset -2);
    house2.castShadow = true; house2.receiveShadow = true; scene.add(house2);
    
    const apartmentBlock = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 5), residentialMaterial);
    apartmentBlock.position.set(-buildingOffset - 5, 4, -buildingOffset - 8);
    apartmentBlock.castShadow = true; apartmentBlock.receiveShadow = true; scene.add(apartmentBlock);

    const shop1 = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 6), commercialMaterial);
    shop1.position.set(buildingOffset, 2.5, -buildingOffset);
    shop1.castShadow = true; shop1.receiveShadow = true; scene.add(shop1);

    const office1 = new THREE.Mesh(new THREE.BoxGeometry(5, 10, 5), commercialMaterial);
    office1.position.set(buildingOffset + 10, 5, -buildingOffset + 8);
    office1.castShadow = true; office1.receiveShadow = true; scene.add(office1);

    const warehouse = new THREE.Mesh(new THREE.BoxGeometry(15, 6, 10), industrialMaterial);
    warehouse.position.set(-buildingOffset + 5, 3, buildingOffset);
    warehouse.castShadow = true; warehouse.receiveShadow = true; scene.add(warehouse);

    const factory = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 8), industrialMaterial);
    const factorySmokestack = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 18, 16), industrialMaterial); 
    factory.position.set(-buildingOffset - 10, 4, buildingOffset + 12);
    factorySmokestack.position.set(-buildingOffset - 13.5, 9, buildingOffset + 14); 
    factory.castShadow = true; factory.receiveShadow = true; scene.add(factory);
    factorySmokestack.castShadow = true; factorySmokestack.receiveShadow = true; scene.add(factorySmokestack);

    const tallerBuilding1 = new THREE.Mesh(new THREE.BoxGeometry(6, 15, 6), downtownMaterial);
    tallerBuilding1.position.set(buildingOffset, 7.5, buildingOffset);
    tallerBuilding1.castShadow = true; tallerBuilding1.receiveShadow = true; scene.add(tallerBuilding1);

    const tallerBuilding2Landmark = new THREE.Mesh(new THREE.BoxGeometry(7, 25, 7), downtownMaterial); 
    tallerBuilding2Landmark.position.set(buildingOffset + 12, 12.5, buildingOffset + 12);
    tallerBuilding2Landmark.castShadow = true; tallerBuilding2Landmark.receiveShadow = true; scene.add(tallerBuilding2Landmark);

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
      
      if (!isPaused.current) {
        gameTimeRef.current = (gameTimeRef.current + delta * 1000) % cycleDuration;
        const cycleProgress = gameTimeRef.current / cycleDuration; // 0 to 1

        let c1, i1, c2, i2, segmentProgress;

        if (cycleProgress < 0.25) { // Day
          c1 = dayColors; i1 = dayIntensities;
          c2 = dayColors; i2 = dayIntensities; // Still day, or start of day->dusk
          segmentProgress = (cycleProgress / 0.25); // Progress within day segment if needed, or 0 for simple day
        } else if (cycleProgress < 0.5) { // Day to Dusk
          c1 = dayColors; i1 = dayIntensities;
          c2 = duskColors; i2 = duskIntensities;
          segmentProgress = (cycleProgress - 0.25) / 0.25;
        } else if (cycleProgress < 0.75) { // Dusk to Night
          c1 = duskColors; i1 = duskIntensities;
          c2 = nightColors; i2 = nightIntensities;
          segmentProgress = (cycleProgress - 0.5) / 0.25;
        } else { // Night to Dawn/Day
          c1 = nightColors; i1 = nightIntensities;
          c2 = dawnColors; i2 = dawnIntensities; 
          segmentProgress = (cycleProgress - 0.75) / 0.25;
        }
        
        if (ambientLightRef.current && directionalLightRef.current && sceneRef.current?.fog && sceneRef.current?.background) {
          ambientLightRef.current.color.lerpColors(c1.ambient, c2.ambient, segmentProgress);
          ambientLightRef.current.intensity = THREE.MathUtils.lerp(i1.ambient, i2.ambient, segmentProgress);
          
          directionalLightRef.current.color.lerpColors(c1.directional, c2.directional, segmentProgress);
          directionalLightRef.current.intensity = THREE.MathUtils.lerp(i1.directional, i2.directional, segmentProgress);

          (sceneRef.current.background as THREE.Color).lerpColors(c1.background, c2.background, segmentProgress);
          (sceneRef.current.fog as THREE.Fog).color.lerpColors(c1.fog, c2.fog, segmentProgress);
        }
      }


      if (isPaused.current) {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        prevTime.current = time - delta * 1000; 
        return;
      }
      
      if (controlsRef.current?.isLocked === true) {
        velocity.current.x -= velocity.current.x * 10.0 * delta;
        velocity.current.z -= velocity.current.z * 10.0 * delta;

        direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
        direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
        direction.current.normalize();

        if (moveForward.current || moveBackward.current) velocity.current.z -= direction.current.z * PLAYER_SPEED * 10.0 * delta;
        if (moveLeft.current || moveRight.current) velocity.current.x -= direction.current.x * PLAYER_SPEED * 10.0 * delta;
        
        controlsRef.current.moveRight(-velocity.current.x * delta);
        controlsRef.current.moveForward(-velocity.current.z * delta);

        const camPos = controlsRef.current.getObject().position;
        const halfGroundMinusWall = GROUND_SIZE / 2 - wallThickness / 2 - 1.0; 
        camPos.x = Math.max(-halfGroundMinusWall, Math.min(halfGroundMinusWall, camPos.x));
        camPos.z = Math.max(-halfGroundMinusWall, Math.min(halfGroundMinusWall, camPos.z));
        camPos.y = 1.7; 
      }
      prevTime.current = time;
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
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
        if (controlsRef.current.isLocked) { // Check if locked before unlocking
          controlsRef.current.unlock();
        }
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      if (rendererRef.current) {
         rendererRef.current.dispose();
         // Dispose scene objects
         if (sceneRef.current) {
             sceneRef.current.traverse(object => {
                if (object instanceof THREE.Mesh) {
                    if (object.geometry) object.geometry.dispose();
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else if (object.material && typeof (object.material as THREE.Material).dispose === 'function') {
                        (object.material as THREE.Material).dispose();
                    }
                }
             });
             sceneRef.current = null; // Clear scene ref
         }
         rendererRef.current = null; // Clear renderer ref
      }
      if (cameraRef.current) {
        cameraRef.current = null; // Clear camera ref
      }
      if (mountRef.current && rendererRef.current?.domElement) { // This check might be problematic if rendererRef.current is nulled above
        // Check if mountRef.current still contains the domElement before removing
        // This part of the cleanup needs to be careful about the order of nulling refs
        // It's safer to remove the child first if the renderer still exists
      }
      // Revised DOM element removal
      if (mountRef.current && currentMount.contains(renderer.domElement)) { // Use the 'renderer' from the setup scope
           currentMount.removeChild(renderer.domElement);
      }
    };
  }, [onKeyDown, onKeyUp, clickToLockHandler, onLockHandler, onUnlockHandler, cycleDuration, dayColors, dayIntensities, duskColors, duskIntensities, nightColors, nightIntensities, dawnColors, dawnIntensities]); // Dependencies should be stable

  return <div ref={mountRef} className="w-full h-full cursor-grab focus:cursor-grabbing" tabIndex={-1} />;
}

