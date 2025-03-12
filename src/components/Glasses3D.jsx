import { useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function GlassesModel({ 
  modelPosition, 
  modelRotation, 
  modelScale, 
  leftEyePosition,
  rightEyePosition,
  noseBridgePosition,
  canvasWidth,
  canvasHeight
}) {
  const { scene } = useGLTF('/models/glasses.glb');
  const modelRef = useRef();
  const leftEyeRef = useRef();
  const rightEyeRef = useRef();
  const noseBridgeRef = useRef();
  const { camera, size } = useThree();

  // Set up camera with correct aspect ratio
  useEffect(() => {
    // Set a fixed camera position
    camera.position.z = 5;
    
    // Update camera aspect ratio to match the video canvas
    if (canvasWidth && canvasHeight) {
      const aspect = canvasWidth / canvasHeight;
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      }
    }
  }, [camera, canvasWidth, canvasHeight]);

  useFrame(() => {
    // Rest of your code remains the same
    if (!modelRef.current) return;
    
    // Apply the pre-calculated transformations from parent component
    if (modelPosition) {
      modelRef.current.position.set(
        modelPosition.x, 
        modelPosition.y, 
        modelPosition.z
      );
    }
    
    if (modelRotation) {
      modelRef.current.rotation.set(
        modelRotation.x, 
        modelRotation.y, 
        modelRotation.z
      );
    }
    
    if (modelScale) {
      modelRef.current.scale.set(
        modelScale, 
        modelScale, 
        modelScale
      );
    }
    
    // Update debug markers
    if (leftEyeRef.current && leftEyePosition) {
      leftEyeRef.current.position.set(
        leftEyePosition.x,
        leftEyePosition.y,
        leftEyePosition.z
      );
    }
    
    if (rightEyeRef.current && rightEyePosition) {
      rightEyeRef.current.position.set(
        rightEyePosition.x,
        rightEyePosition.y,
        rightEyePosition.z
      );
    }
    
    if (noseBridgeRef.current && noseBridgePosition) {
      noseBridgeRef.current.position.set(
        noseBridgePosition.x,
        noseBridgePosition.y,
        noseBridgePosition.z
      );
    }
  });

  return (
    <>
      <primitive object={scene} ref={modelRef} />
      
      {/* Debug spheres for eye tracking */}
      <mesh ref={leftEyeRef}>
        {/* <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="red" opacity={0.7} transparent={true} /> */}
      </mesh>
      <mesh ref={rightEyeRef}>
        {/* <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="blue" opacity={0.7} transparent={true} /> */}
      </mesh>
      
      <mesh ref={noseBridgeRef}>
        {/* <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="green" opacity={0.7} transparent={true} /> */}
      </mesh>
    </>
  );
}

export default function Glasses3D({ 
  modelPosition, 
  modelRotation, 
  modelScale,
  leftEyePosition,
  rightEyePosition,
  noseBridgePosition,
  canvasWidth,
  canvasHeight,
  visible = true 
}) {
  if (!visible) return null;
  
  return (
    <Canvas
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${canvasWidth}px`,  // Use exact width
        height: `${canvasHeight}px`, // Use exact height
        pointerEvents: 'none'
      }}
      gl={{ alpha: true }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 0, 5]} intensity={1} />
      <GlassesModel 
        modelPosition={modelPosition}
        modelRotation={modelRotation}
        modelScale={modelScale}
        leftEyePosition={leftEyePosition}
        rightEyePosition={rightEyePosition}
        noseBridgePosition={noseBridgePosition}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
      />
    </Canvas>
  );
}
