import { useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function GlassesModel({ faceLandmarks, canvasWidth, canvasHeight }) {
  const { scene } = useGLTF('/models/glasses.glb');
  const modelRef = useRef();
  const leftEyeRef = useRef();
  const rightEyeRef = useRef();
  const { camera } = useThree();

  useEffect(() => {
    // Set up camera
    camera.position.z = 5;
  }, [scene, camera]);

  useFrame(() => {
    if (!modelRef.current || !faceLandmarks || !leftEyeRef.current || !rightEyeRef.current) return;

    if (faceLandmarks.length > 0) {
      const landmarks = faceLandmarks[0];
      
      // Calculate position from face landmarks
      const leftEye = landmarks[33];
      const rightEye = landmarks[263];
      const noseBridge = landmarks[168];
      const chin = landmarks[199]; // Adding chin point for better depth estimation
      
      // Get the normalized positions (0-1) and convert to Three.js coordinate space
      // Three.js uses -1 to 1 coordinate system, so we need to convert from 0-1
      // and flip the y-axis
      const threeLeftEyeX = (leftEye.x * 2 - 1) * 5;
      const threeLeftEyeY = -(leftEye.y * 2 - 1) * 5;
      
      const threeRightEyeX = (rightEye.x * 2 - 1) * 5;
      const threeRightEyeY = -(rightEye.y * 2 - 1) * 5;
      
      const threeNoseBridgeX = (noseBridge.x * 2 - 1) * 5;
      const threeNoseBridgeY = -(noseBridge.y * 2 - 1) * 5;
      
      // Position eye markers exactly matching the 2D canvas coordinates
      leftEyeRef.current.position.set(
        threeLeftEyeX,
        threeLeftEyeY,
        -0.5
      );
      
      rightEyeRef.current.position.set(
        threeRightEyeX,
        threeRightEyeY,
        -0.5
      );
      
      // Calculate scale based on eye distance
      const eyeDistance = Math.sqrt(
        Math.pow((rightEye.x - leftEye.x) * canvasWidth, 2) +
        Math.pow((rightEye.y - leftEye.y) * canvasHeight, 2)
      );
      
      const scale = eyeDistance / 20 * 5;
      
      // Calculate tilt rotation based on eye positions (roll)
      const tiltAngle = Math.atan2(
        (rightEye.y - leftEye.y) * canvasHeight,
        (rightEye.x - leftEye.x) * canvasWidth
      );
      
      // Calculate horizontal rotation (yaw) based on face geometry
      // Use the difference between left and right eye z values for rotation estimation
      const eyesZDiff = rightEye.z - leftEye.z;
      // Scale the yaw angle to make it more responsive
      const yawAngle = eyesZDiff * 3.0;
      
      // Apply transformations to glasses
      modelRef.current.position.set(threeNoseBridgeX, threeNoseBridgeY - 0.1, -1);
      
      // Apply rotations:
      // 1. Tilt/roll rotation around Z-axis (looking up/down)
      // 2. Yaw rotation around Y-axis (looking left/right)
      modelRef.current.rotation.set(0, yawAngle, -tiltAngle * 1);
      
      modelRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <>
      <primitive object={scene} ref={modelRef} />
      {/* Debug dots for eye positions */}
      <mesh ref={leftEyeRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="red" />
      </mesh>
      <mesh ref={rightEyeRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="blue" />
      </mesh>
    </>
  );
}

export default function Glasses3D({ faceLandmarks, canvasWidth, canvasHeight, visible = true }) {
  if (!visible) return null;
  
  return (
    <Canvas
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
      gl={{ alpha: true }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 0, 5]} intensity={1} />
      <GlassesModel 
        faceLandmarks={faceLandmarks} 
        canvasWidth={canvasWidth} 
        canvasHeight={canvasHeight} 
      />
    </Canvas>
  );
}