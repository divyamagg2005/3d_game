
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
    controlsRef.current?.lock();
  }, []);

  const onLockHandler = useCallback(() => {
    const instructionsEl = document.getElementById('instructions');
    const blockerEl = document.getElementById('blocker');
    if (instructionsEl) instructionsEl.style.display = 'none';
    if (blockerEl) blockerEl.style.display = 'none';
  }, []);

  const onUnlockHandler = useCallback(() => {
    const instructionsEl = document.getElementById('instructions');
    const blockerEl = document.getElementById('blocker');
    if (blockerEl) blockerEl.style.display = 'grid'; // Revert to grid as per GameUIOverlay's class
    if (instructionsEl) instructionsEl.style.display = ''; // Revert to default display (block)
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !mountRef.current) return;

    const currentMount = mountRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2A2A2E);
    scene.fog = new THREE.Fog(0x2A2A2E, GROUND_SIZE / 4, GROUND_SIZE * 0.8);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls (Pointer Lock)
    const controls = new PointerLockControls(camera, renderer.domElement);
    scene.add(controls.getObject());
    controlsRef.current = controls;
    
    const instructionsElement = document.getElementById('instructions');
    const blockerElement = document.getElementById('blocker');

    if (instructionsElement && blockerElement) {
      instructionsElement.addEventListener('click', clickToLockHandler);
      controls.addEventListener('lock', onLockHandler);
      controls.addEventListener('unlock', onUnlockHandler);
      
      // Ensure initial visibility state is correct
      if (!controls.isLocked) {
        blockerElement.style.display = 'grid';
        instructionsElement.style.display = ''; // Default display (block)
      } else {
        blockerElement.style.display = 'none';
        instructionsElement.style.display = 'none';
      }
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(20, 30, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    // ... (rest of directionalLight shadow properties)
    scene.add(directionalLight);
    
    // Ground, Walls, Obstacles, Car, Gun Store... (same as before)
    const groundGeometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8, metalness: 0.2 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const wallHeight = 10;
    const wallThickness = 2;
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x404040, roughness: 0.9 });
    const wallN = new THREE.Mesh(new THREE.BoxGeometry(GROUND_SIZE, wallHeight, wallThickness), wallMaterial);
    wallN.position.set(0, wallHeight/2, -GROUND_SIZE/2);
    wallN.castShadow = true; wallN.receiveShadow = true; scene.add(wallN);
    const wallS = new THREE.Mesh(new THREE.BoxGeometry(GROUND_SIZE, wallHeight, wallThickness), wallMaterial);
    wallS.position.set(0, wallHeight/2, GROUND_SIZE/2);
    wallS.castShadow = true; wallS.receiveShadow = true; scene.add(wallS);
    const wallE = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, GROUND_SIZE), wallMaterial);
    wallE.position.set(GROUND_SIZE/2, wallHeight/2, 0);
    wallE.castShadow = true; wallE.receiveShadow = true; scene.add(wallE);
    const wallW = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, GROUND_SIZE), wallMaterial);
    wallW.position.set(-GROUND_SIZE/2, wallHeight/2, 0);
    wallW.castShadow = true; wallW.receiveShadow = true; scene.add(wallW);

    const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0xCD7F32, roughness: 0.5, metalness: 0.5 });
    for (let i = 0; i < 5; i++) {
      const size = Math.random() * 4 + 2;
      const obstacle = new THREE.Mesh(new THREE.BoxGeometry(size, size * 1.5, size), obstacleMaterial);
      obstacle.position.set(
        (Math.random() - 0.5) * (GROUND_SIZE - 10),
        size * 0.75,
        (Math.random() - 0.5) * (GROUND_SIZE - 10)
      );
      obstacle.castShadow = true;
      obstacle.receiveShadow = true;
      scene.add(obstacle);
    }
    
    const carMaterial = new THREE.MeshStandardMaterial({ color: 0x3333CC, roughness: 0.2, metalness: 0.8 });
    const car = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 2), carMaterial);
    car.position.set(10, 0.75, 10);
    car.castShadow = true;
    car.receiveShadow = true;
    scene.add(car);
    
    const storeMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.3, metalness: 0.7 });
    const gunStore = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 3), storeMaterial);
    gunStore.position.set(-15, 2, -15);
    gunStore.castShadow = true;
    gunStore.receiveShadow = true;
    scene.add(gunStore);

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

    const animate = () => {
      requestAnimationFrame(animate);
      const time = performance.now();
      const delta = (time - prevTime.current) / 1000;

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
        const halfGround = GROUND_SIZE / 2 - 1;
        camPos.x = Math.max(-halfGround, Math.min(halfGround, camPos.x));
        camPos.z = Math.max(-halfGround, Math.min(halfGround, camPos.z));
        camPos.y = 1.7;
      }
      prevTime.current = time;
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);

      const currentInstructions = document.getElementById('instructions');
      if (currentInstructions) {
        currentInstructions.removeEventListener('click', clickToLockHandler);
      }
      
      if (controlsRef.current) {
        controlsRef.current.removeEventListener('lock', onLockHandler);
        controlsRef.current.removeEventListener('unlock', onUnlockHandler);
        controlsRef.current.dispose();
      }
      if (rendererRef.current) rendererRef.current.dispose();
      if (mountRef.current && rendererRef.current?.domElement) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              (object.material as THREE.Material).dispose();
            }
          }
        }
      });
    };
  }, [onKeyDown, onKeyUp, clickToLockHandler, onLockHandler, onUnlockHandler]);

  return <div ref={mountRef} className="w-full h-full cursor-grab focus:cursor-grabbing" />;
}
