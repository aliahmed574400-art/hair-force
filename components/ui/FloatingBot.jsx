"use client";

import { Suspense, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { AnimationMixer, Box3, Color, MathUtils, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import styles from "@/components/ui/FloatingBot.module.css";

const DISCOVER_ROUTE = "/discover";
const MODEL_PATH = "/models/ybot-original-robot.glb";
const FACE_SMILE_COLOR = new Color("#92f2ff");
const FACE_ANGRY_COLOR = new Color("#ff8b76");
const FACE_POP_COLOR = new Color("#f7fbff");

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cloneDisplayMaterial(material) {
  if (!material) {
    return material;
  }

  if (Array.isArray(material)) {
    return material.map((entry) => {
      const cloned = entry.clone();
      cloned.toneMapped = false;
      return cloned;
    });
  }

  const cloned = material.clone();
  cloned.toneMapped = false;
  return cloned;
}

function getPrimaryMaterial(material) {
  return Array.isArray(material) ? material[0] : material;
}

function RobotModel({ hoveredRef, pointerRef, gesture, expression, onReady }) {
  const rootRef = useRef(null);
  const modelRef = useRef(null);
  const mixerRef = useRef(null);
  const gltf = useLoader(GLTFLoader, MODEL_PATH);

  const preparedModel = useMemo(() => {
    const clonedScene = clone(gltf.scene);
    const bounds = new Box3();
    const size = new Vector3();
    const center = new Vector3();
    const neckBone = clonedScene.getObjectByName("Bone023");
    const headBone = clonedScene.getObjectByName("Bone034");
    const rightUpperArm = clonedScene.getObjectByName("Bone001R");
    const rightForearm = clonedScene.getObjectByName("Bone006R");
    const leftUpperArm = clonedScene.getObjectByName("Bone001L");
    const eyes = clonedScene.getObjectByName("Eyes");
    const mouth = clonedScene.getObjectByName("Mouth");

    clonedScene.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      if (child.name === "Floor") {
        child.visible = false;
        return;
      }

      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = false;
    });

    [eyes, mouth].forEach((mesh) => {
      if (!mesh?.isMesh) {
        return;
      }

      mesh.material = cloneDisplayMaterial(mesh.material);

      const material = getPrimaryMaterial(mesh.material);

      if (material && "emissiveIntensity" in material) {
        material.emissiveIntensity = 1.45;
      }
    });

    const eyeMaterial = getPrimaryMaterial(eyes?.material);
    const mouthMaterial = getPrimaryMaterial(mouth?.material);

    bounds.setFromObject(clonedScene);
    bounds.getSize(size);
    bounds.getCenter(center);

    const fitHeight = size.y > 0 ? 4.18 / size.y : 1;
    const fitWidth = size.x > 0 ? 3.76 / size.x : fitHeight;
    const fitDepth = size.z > 0 ? 3.6 / size.z : fitHeight;
    const normalizedScale = Math.min(fitHeight, fitWidth, fitDepth);

    return {
      scene: clonedScene,
      scale: normalizedScale,
      offset: [-center.x * normalizedScale, -center.y * normalizedScale - 0.04, -center.z * normalizedScale],
      rig: {
        neckBone,
        headBone,
        rightUpperArm,
        rightForearm,
        leftUpperArm,
        eyes,
        mouth,
        eyeMaterial,
        mouthMaterial,
        base: {
          neckRotation: neckBone?.rotation.clone() ?? null,
          headRotation: headBone?.rotation.clone() ?? null,
          rightUpperArmRotation: rightUpperArm?.rotation.clone() ?? null,
          rightForearmRotation: rightForearm?.rotation.clone() ?? null,
          leftUpperArmRotation: leftUpperArm?.rotation.clone() ?? null,
          eyesScale: eyes?.scale.clone() ?? null,
          eyesPosition: eyes?.position.clone() ?? null,
          mouthScale: mouth?.scale.clone() ?? null,
          mouthPosition: mouth?.position.clone() ?? null,
          mouthRotation: mouth?.rotation.clone() ?? null,
          eyeColor: eyeMaterial?.color?.clone() ?? null,
          eyeEmissive: eyeMaterial?.emissive?.clone() ?? null,
          mouthColor: mouthMaterial?.color?.clone() ?? null,
          mouthEmissive: mouthMaterial?.emissive?.clone() ?? null
        }
      }
    };
  }, [gltf.scene]);

  useEffect(() => {
    if (!gltf.animations?.length) {
      return undefined;
    }

    const mixer = new AnimationMixer(preparedModel.scene);
    mixerRef.current = mixer;

    gltf.animations.forEach((clip) => {
      mixer.clipAction(clip).play();
    });

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
    };
  }, [gltf.animations, preparedModel.scene]);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  useFrame((state, delta) => {
    if (!rootRef.current || !modelRef.current) {
      return;
    }

    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    const elapsed = state.clock.getElapsedTime();
    const hoverBoost = hoveredRef.current ? 1 : 0;
    const pointerX = pointerRef.current.x;
    const pointerY = pointerRef.current.y;
    const expressionAge = performance.now() - expression.startedAt;
    const expressionProgress = expression.duration > 0 ? Math.min(expressionAge / expression.duration, 1) : 1;
    const expressionActive = expressionProgress < 1;
    const expressionType = expressionActive ? expression.type : "neutral";
    const expressionStrength = expressionActive ? 1 - expressionProgress : 0;

    const actionAge = performance.now() - gesture.startedAt;
    const actionProgress = gesture.duration > 0 ? Math.min(actionAge / gesture.duration, 1) : 1;
    const actionDecay = 1 - actionProgress;
    const actionActive = actionProgress < 1;

    let waveOffset = 0;
    let pulseOffset = 0;
    let pitchOffset = 0;

    if (actionActive && (gesture.type === "greet" || gesture.type === "wave")) {
      const frequency = gesture.type === "greet" ? 4 : 5;
      waveOffset = Math.sin(actionProgress * Math.PI * frequency) * actionDecay;
      pitchOffset = Math.sin(actionProgress * Math.PI * 2) * 0.06 * actionDecay;
    }

    if (actionActive && gesture.type === "pulse") {
      pulseOffset = Math.sin(actionProgress * Math.PI) * actionDecay;
    }

    const forcedBlink = expressionType === "blink" ? Math.sin(expressionProgress * Math.PI) : 0;
    const blinkAmount = clamp(forcedBlink, 0, 1);
    const smileAmount = expressionType === "smile" ? expressionStrength : 0;
    const angryAmount = expressionType === "angry" ? expressionStrength : 0;
    const popAmount = expressionType === "pop" ? expressionStrength : 0;
    const greetingAmount = actionActive && (gesture.type === "greet" || gesture.type === "wave") ? actionDecay : 0;
    const { rig } = preparedModel;

    const targetScale = 1 + hoverBoost * 0.06 + pulseOffset * 0.07;
    const nextScale = MathUtils.damp(rootRef.current.scale.x, targetScale, 5.2, delta);
    rootRef.current.scale.setScalar(nextScale);

    rootRef.current.position.y = MathUtils.damp(
      rootRef.current.position.y,
      -0.04 + Math.sin(elapsed * 1.35) * 0.012 + hoverBoost * 0.035 + pulseOffset * 0.03,
      4.5,
      delta
    );

    rootRef.current.rotation.x = MathUtils.damp(
      rootRef.current.rotation.x,
      -0.03 - pointerY * 0.02 + hoverBoost * 0.04 + pitchOffset,
      5.5,
      delta
    );

    rootRef.current.rotation.y = MathUtils.damp(
      rootRef.current.rotation.y,
      0.02 + pointerX * 0.02 + hoverBoost * 0.06,
      5.5,
      delta
    );

    rootRef.current.position.x = MathUtils.damp(
      rootRef.current.position.x,
      waveOffset * 0.12,
      5.8,
      delta
    );

    modelRef.current.rotation.x = MathUtils.damp(
      modelRef.current.rotation.x,
      0.02 + pointerY * 0.01 + waveOffset * 0.04 + pitchOffset,
      6.4,
      delta
    );

    modelRef.current.rotation.y = MathUtils.damp(
      modelRef.current.rotation.y,
      0.02 + hoverBoost * 0.06 + pointerX * 0.01 + waveOffset * 0.04,
      6.4,
      delta
    );

    modelRef.current.rotation.z = MathUtils.damp(
      modelRef.current.rotation.z,
      waveOffset * 0.18 - pointerX * 0.004,
      6.4,
      delta
    );

    if (rig.neckBone && rig.base.neckRotation) {
      rig.neckBone.rotation.x = MathUtils.damp(
        rig.neckBone.rotation.x,
        rig.base.neckRotation.x - pointerY * 0.18 + pitchOffset * 0.22 - angryAmount * 0.05,
        9.4,
        delta
      );
      rig.neckBone.rotation.y = MathUtils.damp(
        rig.neckBone.rotation.y,
        rig.base.neckRotation.y + pointerX * 0.34 + waveOffset * 0.02,
        9.4,
        delta
      );
      rig.neckBone.rotation.z = MathUtils.damp(
        rig.neckBone.rotation.z,
        rig.base.neckRotation.z + waveOffset * 0.05 - pointerX * 0.05,
        9.4,
        delta
      );
    }

    if (rig.headBone && rig.base.headRotation) {
      rig.headBone.rotation.x = MathUtils.damp(
        rig.headBone.rotation.x,
        rig.base.headRotation.x - pointerY * 0.52 + hoverBoost * 0.02 + pitchOffset * 0.3 - angryAmount * 0.08,
        10.8,
        delta
      );
      rig.headBone.rotation.y = MathUtils.damp(
        rig.headBone.rotation.y,
        rig.base.headRotation.y + pointerX * 0.9 + waveOffset * 0.04,
        10.8,
        delta
      );
      rig.headBone.rotation.z = MathUtils.damp(
        rig.headBone.rotation.z,
        rig.base.headRotation.z + waveOffset * 0.08 + smileAmount * 0.03 - angryAmount * 0.05 - pointerX * 0.09,
        10.8,
        delta
      );
    }

    if (rig.rightUpperArm && rig.base.rightUpperArmRotation) {
      rig.rightUpperArm.rotation.x = MathUtils.damp(
        rig.rightUpperArm.rotation.x,
        rig.base.rightUpperArmRotation.x + greetingAmount * 0.46 - waveOffset * 0.08,
        8,
        delta
      );
      rig.rightUpperArm.rotation.y = MathUtils.damp(
        rig.rightUpperArm.rotation.y,
        rig.base.rightUpperArmRotation.y + waveOffset * 0.18,
        8,
        delta
      );
      rig.rightUpperArm.rotation.z = MathUtils.damp(
        rig.rightUpperArm.rotation.z,
        rig.base.rightUpperArmRotation.z - greetingAmount * 1.18 + waveOffset * 0.4,
        8,
        delta
      );
    }

    if (rig.rightForearm && rig.base.rightForearmRotation) {
      rig.rightForearm.rotation.x = MathUtils.damp(
        rig.rightForearm.rotation.x,
        rig.base.rightForearmRotation.x + greetingAmount * 0.36 - waveOffset * 0.18,
        9.4,
        delta
      );
      rig.rightForearm.rotation.y = MathUtils.damp(
        rig.rightForearm.rotation.y,
        rig.base.rightForearmRotation.y + waveOffset * 0.16,
        9.4,
        delta
      );
      rig.rightForearm.rotation.z = MathUtils.damp(
        rig.rightForearm.rotation.z,
        rig.base.rightForearmRotation.z + greetingAmount * 1.08 + waveOffset * 1.18,
        9.4,
        delta
      );
    }

    if (rig.leftUpperArm && rig.base.leftUpperArmRotation) {
      rig.leftUpperArm.rotation.z = MathUtils.damp(
        rig.leftUpperArm.rotation.z,
        rig.base.leftUpperArmRotation.z - hoverBoost * 0.05 - waveOffset * 0.02,
        8,
        delta
      );
    }

    if (rig.eyes && rig.base.eyesScale && rig.base.eyesPosition) {
      rig.eyes.scale.x = MathUtils.damp(
        rig.eyes.scale.x,
        rig.base.eyesScale.x,
        10,
        delta
      );
      rig.eyes.scale.y = MathUtils.damp(
        rig.eyes.scale.y,
        rig.base.eyesScale.y * clamp(1 - blinkAmount * 0.88, 0.16, 1),
        10,
        delta
      );
      rig.eyes.scale.z = MathUtils.damp(
        rig.eyes.scale.z,
        rig.base.eyesScale.z,
        10,
        delta
      );
      rig.eyes.position.y = MathUtils.damp(
        rig.eyes.position.y,
        rig.base.eyesPosition.y,
        10,
        delta
      );
    }

    if (rig.mouth && rig.base.mouthScale && rig.base.mouthPosition && rig.base.mouthRotation) {
      rig.mouth.scale.x = MathUtils.damp(
        rig.mouth.scale.x,
        rig.base.mouthScale.x * (1 + smileAmount * 0.16 + popAmount * 0.28 - angryAmount * 0.08),
        10,
        delta
      );
      rig.mouth.scale.y = MathUtils.damp(
        rig.mouth.scale.y,
        rig.base.mouthScale.y * (1 + smileAmount * 0.12 + popAmount * 0.42 - angryAmount * 0.18),
        10,
        delta
      );
      rig.mouth.scale.z = MathUtils.damp(
        rig.mouth.scale.z,
        rig.base.mouthScale.z * (1 + popAmount * 0.15),
        10,
        delta
      );
      rig.mouth.position.y = MathUtils.damp(
        rig.mouth.position.y,
        rig.base.mouthPosition.y + smileAmount * 0.012 - angryAmount * 0.008 - popAmount * 0.004,
        10,
        delta
      );
      rig.mouth.rotation.z = MathUtils.damp(
        rig.mouth.rotation.z,
        rig.base.mouthRotation.z + angryAmount * 0.12 - smileAmount * 0.03,
        10,
        delta
      );
    }

    if (rig.eyeMaterial && rig.base.eyeColor && rig.base.eyeEmissive) {
      rig.eyeMaterial.color.copy(rig.base.eyeColor);
      rig.eyeMaterial.emissive.copy(rig.base.eyeEmissive);
      rig.eyeMaterial.emissiveIntensity = 1.45;
    }

    if (rig.mouthMaterial && rig.base.mouthColor && rig.base.mouthEmissive) {
      rig.mouthMaterial.color.copy(rig.base.mouthColor);
      rig.mouthMaterial.emissive.copy(rig.base.mouthEmissive);
      rig.mouthMaterial.color.lerp(FACE_SMILE_COLOR, smileAmount * 0.45);
      rig.mouthMaterial.emissive.lerp(FACE_SMILE_COLOR, smileAmount * 0.45);
      rig.mouthMaterial.color.lerp(FACE_ANGRY_COLOR, angryAmount * 0.68);
      rig.mouthMaterial.emissive.lerp(FACE_ANGRY_COLOR, angryAmount * 0.68);
      rig.mouthMaterial.color.lerp(FACE_POP_COLOR, popAmount * 0.5);
      rig.mouthMaterial.emissive.lerp(FACE_POP_COLOR, popAmount * 0.5);
      rig.mouthMaterial.emissiveIntensity = 1.45 + smileAmount * 0.16 + angryAmount * 0.22 + popAmount * 0.45;
    }
  });

  return (
    <group ref={rootRef} position={[0, -0.08, 0]} scale={1.58}>
      <group
        ref={modelRef}
        position={preparedModel.offset}
        scale={preparedModel.scale}
        rotation={[0.02, 0.12, 0]}
      >
        <primitive object={preparedModel.scene} />
      </group>
    </group>
  );
}

export default function FloatingBot() {
  const router = useRouter();
  const timeoutRef = useRef(null);
  const welcomeTimeoutRef = useRef(null);
  const welcomeWaveTriggeredRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const hoveredRef = useRef(false);

  const [isHovered, setIsHovered] = useState(false);
  const [gesture, setGesture] = useState(() => ({
    type: "idle",
    startedAt: performance.now(),
    duration: 0
  }));
  const [expression, setExpression] = useState(() => ({
    type: "neutral",
    startedAt: performance.now(),
    duration: 0
  }));

  const triggerGesture = useCallback((type = "pulse", duration = 1000) => {
    setGesture({
      type,
      startedAt: performance.now(),
      duration
    });
  }, []);

  const triggerExpression = useCallback((type = "neutral", duration = 1000) => {
    setExpression({
      type,
      startedAt: performance.now(),
      duration
    });
  }, []);

  const setHoverState = useCallback((value) => {
    hoveredRef.current = value;
    setIsHovered(value);
  }, []);

  const handleActivate = useCallback(() => {
    triggerGesture("wave", 1200);
    triggerExpression("pop", 900);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      startTransition(() => {
        router.push(DISCOVER_ROUTE);
      });
    }, 220);
  }, [router, triggerExpression, triggerGesture]);

  useEffect(() => {
    function handleWindowPointerMove(event) {
      pointerRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    }

    function resetPointer() {
      pointerRef.current.x = 0;
      pointerRef.current.y = 0;
    }

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerleave", resetPointer);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerleave", resetPointer);
    };
  }, []);

  useEffect(() => {
    function handleExternalTrigger(event) {
      const action = event.detail?.action;

      if (action === "discover") {
        handleActivate();
        return;
      }

      if (action === "greet") {
        triggerGesture("greet", 1800);
        triggerExpression("smile", 2200);
        return;
      }

      if (action === "wave") {
        triggerGesture("wave", 1200);
        triggerExpression("smile", 1400);
        return;
      }

      if (action === "smile") {
        triggerExpression("smile", 1800);
        return;
      }

      if (action === "angry") {
        triggerExpression("angry", 1400);
        return;
      }

      if (action === "blink") {
        triggerExpression("blink", 240);
        return;
      }

      if (action === "pop") {
        triggerExpression("pop", 900);
        return;
      }

      triggerGesture("pulse", 900);
      triggerExpression("smile", 1000);
    }

    window.addEventListener("hairforce-bot:trigger", handleExternalTrigger);

    return () => {
      window.removeEventListener("hairforce-bot:trigger", handleExternalTrigger);
    };
  }, [handleActivate, triggerExpression, triggerGesture]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (welcomeTimeoutRef.current) {
        clearTimeout(welcomeTimeoutRef.current);
      }
    };
  }, []);

  const handleModelReady = useCallback(() => {
    if (welcomeWaveTriggeredRef.current) {
      return;
    }

    welcomeWaveTriggeredRef.current = true;

    welcomeTimeoutRef.current = setTimeout(() => {
      triggerGesture("greet", 3200);
      triggerExpression("smile", 3200);
    }, 450);
  }, [triggerExpression, triggerGesture]);

  return (
    <div
      className={`${styles.shell} ${isHovered ? styles.shellHovered : ""}`.trim()}
      role="button"
      tabIndex={0}
      aria-label="Open stylist discovery"
      onMouseEnter={() => {
        setHoverState(true);
        triggerGesture("pulse", 850);
        triggerExpression("smile", 1200);
      }}
      onMouseLeave={() => {
        setHoverState(false);
      }}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleActivate();
        }
      }}
    >
      <div className={styles.glow} />
      <div className={styles.frame}>
        <Canvas
          className={styles.scene}
          dpr={[0.75, 1.1]}
          camera={{ position: [0, 0.02, 4.4], fov: 14 }}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <ambientLight intensity={1.35} />
          <directionalLight position={[3.2, 3.6, 3.8]} intensity={1.9} color="#f7fbff" />
          <directionalLight position={[-4, 2.2, 2]} intensity={0.9} color="#8eb8ff" />
          <pointLight position={[0, -1.2, 2.8]} intensity={0.55} color="#76d7ff" />
          <Suspense fallback={null}>
            <RobotModel
              hoveredRef={hoveredRef}
              pointerRef={pointerRef}
              gesture={gesture}
              expression={expression}
              onReady={handleModelReady}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
