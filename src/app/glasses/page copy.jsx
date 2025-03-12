"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import Link from "next/link";
import Glasses3D from "../../components/Glasses3D";

export default function VirtualTryOnComponent() {
  // Refs for video, canvas, and animation
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Additional refs to avoid unnecessary re-renders
  const faceLandmarkerRef = useRef(null);
  const ctxRef = useRef(null);
  const eyeDistanceRef = useRef(0);
  const faceLandmarksRef = useRef(null);
  
  // Pre-allocate objects for 3D transformations to avoid GC
  const modelPositionRef = useRef({ x: 0, y: 0, z: 0 });
  const modelRotationRef = useRef({ x: 0, y: 0, z: 0 });
  const eyePositionsRef = useRef({
    leftEye: { x: 0, y: 0, z: 0 },
    rightEye: { x: 0, y: 0, z: 0 },
    noseBridge: { x: 0, y: 0, z: 0 }
  });

  // State for UI control only
  const [webcamRunning, setWebcamRunning] = useState(false);
  const [glassesVisible, setGlassesVisible] = useState(true);
  const [modelScale, setModelScale] = useState(1); // This one we keep as state since it's needed by React

  // Constants to avoid recalculations
  const FACTOR = 5;
  const SCALE_DIVIDER = 20;
  const SCALE_MULTIPLIER = 5;
  const YAW_MULTIPLIER = 3.0;

  useEffect(() => {
    initializeFaceLandmarker();
    window.addEventListener("resize", handleResize);
    
    // Proper cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      stopWebcam();
    };
  }, []);

  // When FaceLandmarker is ready, start the webcam
  useEffect(() => {
    if (faceLandmarkerRef.current) {
      startWebcam();
    }
  }, [faceLandmarkerRef.current]);

  // Memoized resize handler
  const handleResize = useCallback(() => {
    if (canvasRef.current && videoRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
    }
  }, []);

  // Initialize the FaceLandmarker
  const initializeFaceLandmarker = async () => {
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks("/models/wasm");
      const flInstance = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: "/models/face_landmarker.task",
          delegate: "GPU",
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1,
      });
      
      faceLandmarkerRef.current = flInstance;
      
      if (canvasRef.current) {
        ctxRef.current = canvasRef.current.getContext("2d", { alpha: false }); // alpha: false for better performance
      }
    } catch (error) {
      console.error("Error initializing FaceLandmarker:", error);
    }
  };

  // Start the webcam and detection loop
  const startWebcam = async () => {
    if (!faceLandmarkerRef.current) {
      alert("Face Landmarker is still loading. Please try again.");
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: 640, height: 480 } 
      });
      
      videoRef.current.srcObject = stream;
      videoRef.current.style.display = "block";
      setWebcamRunning(true);

      videoRef.current.oncanplay = async () => {
        try {
          await videoRef.current.play();
          
          // Set initial canvas size
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
          
          // Start detection loop
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
          detect();
        } catch (err) {
          console.error("Error playing video:", err);
        }
      };
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  // Optimized detection loop
  const detect = useCallback(() => {
    if (!faceLandmarkerRef.current || !ctxRef.current || !videoRef.current || 
        videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      animationRef.current = requestAnimationFrame(detect);
      return;
    }

    // Run face landmark detection
    const results = faceLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    
    // Clear canvas and draw current video frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // Process face landmarks if detected
    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
      const landmarks = results.faceLandmarks[0];
      faceLandmarksRef.current = landmarks;
      
      // Only draw landmarks if glasses are visible
      if (glassesVisible) {
        // Get key points directly - avoid unnecessary array lookups
        const leftEye = landmarks[468]; // Actual pupil center for left eye
        const rightEye = landmarks[473]; // Actual pupil center for right eye
        const noseBridge = landmarks[168]; // Nose bridge point
        
        // Draw selected landmarks only when needed
        // Use integer values for better performance
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Batch similar drawing operations to minimize context state changes
        // Draw all landmarks first
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < landmarks.length; i++) {
          const landmark = landmarks[i];
          ctx.beginPath();
          ctx.arc(
            landmark.x * canvasWidth,
            landmark.y * canvasHeight,
            1.5, 0, 2 * Math.PI
          );
          
          // Change fill style only when needed
          if (i === 39) ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
          else if (i === 263) ctx.fillStyle = 'rgba(0, 0, 255, 0.7)';
          else if (i === 168) ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
          else if (i === 468 || i === 473) continue; // Skip these as we'll draw them larger
          else ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          
          ctx.fill();
        }
        
        // Draw larger indicators
        // First set common properties
        ctx.lineWidth = 2;
        
        // Draw left eye dot (red)
        ctx.beginPath();
        ctx.arc(
          leftEye.x * canvasWidth, 
          leftEye.y * canvasHeight, 
          5, 0, 2 * Math.PI
        );
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fill();
        
        // Draw right eye dot (blue)
        ctx.beginPath();
        ctx.arc(
          rightEye.x * canvasWidth, 
          rightEye.y * canvasHeight, 
          5, 0, 2 * Math.PI
        );
        ctx.fillStyle = 'rgba(0, 0, 255, 0.7)';
        ctx.fill();
        
        // Draw nose bridge dot (green)
        ctx.beginPath();
        ctx.arc(
          noseBridge.x * canvasWidth, 
          noseBridge.y * canvasHeight, 
          5, 0, 2 * Math.PI
        );
        ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.fill();
        
        // Calculate 3D transformations - use existing ref objects
        const threeLeftEyeX = (leftEye.x * 2 - 1) * FACTOR;
        const threeLeftEyeY = -(leftEye.y * 2 - 1) * FACTOR;
        const threeRightEyeX = (rightEye.x * 2 - 1) * FACTOR;
        const threeRightEyeY = -(rightEye.y * 2 - 1) * FACTOR;
        const threeNoseBridgeX = (noseBridge.x * 2 - 1) * FACTOR;
        const threeNoseBridgeY = -(noseBridge.y * 2 - 1) * FACTOR;
        
        // Calculate distance, scale, angles
        const xDiff = rightEye.x - leftEye.x;
        const yDiff = rightEye.y - leftEye.y;
        const eyeDistance = Math.sqrt(
          (xDiff * canvasWidth) ** 2 + (yDiff * canvasHeight) ** 2
        );
        eyeDistanceRef.current = eyeDistance;
        
        // Calculate scale once and store it
        const scale = (eyeDistance / SCALE_DIVIDER) * SCALE_MULTIPLIER;
        
        // Calculate rotation
        const tiltAngle = Math.atan2(yDiff * canvasHeight, xDiff * canvasWidth);
        const eyesZDiff = rightEye.z - leftEye.z;
        const yawAngle = eyesZDiff * YAW_MULTIPLIER;
        
        // Update refs with calculated values - reuse the same objects
        modelPositionRef.current.x = threeNoseBridgeX;
        modelPositionRef.current.y = threeNoseBridgeY;
        modelPositionRef.current.z = 0;
        
        modelRotationRef.current.x = 0;
        modelRotationRef.current.y = yawAngle;
        modelRotationRef.current.z = -tiltAngle;
        
        // Only update scale through setState if it's changed significantly
        if (Math.abs(scale - modelScale) > 0.05) {
          setModelScale(scale);
        }
        
        // Update eye positions
        eyePositionsRef.current.leftEye.x = threeLeftEyeX;
        eyePositionsRef.current.leftEye.y = threeLeftEyeY;
        eyePositionsRef.current.leftEye.z = 0;
        
        eyePositionsRef.current.rightEye.x = threeRightEyeX;
        eyePositionsRef.current.rightEye.y = threeRightEyeY;
        eyePositionsRef.current.rightEye.z = 0;
        
        eyePositionsRef.current.noseBridge.x = threeNoseBridgeX;
        eyePositionsRef.current.noseBridge.y = threeNoseBridgeY;
        eyePositionsRef.current.noseBridge.z = 0;
      }
    } else {
      faceLandmarksRef.current = null;
    }

    animationRef.current = requestAnimationFrame(detect);
  }, [glassesVisible, modelScale]);

  // Memoized event handlers to prevent recreation on each render
  const toggleGlasses = useCallback(() => {
    setGlassesVisible(prev => !prev);
  }, []);

  const takeSnapshot = useCallback(() => {
    if (!canvasRef.current || !ctxRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "snapshot.png";
    link.click();
  }, []);

  const stopWebcam = useCallback(() => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setWebcamRunning(false);
  }, []);

  // Only render the 3D glasses if faceLandmarks exist and glasses are visible
  const renderGlasses = useMemo(() => {
    return faceLandmarksRef.current && glassesVisible && (
      <Glasses3D
        modelPosition={modelPositionRef.current}
        modelRotation={modelRotationRef.current}
        modelScale={modelScale}
        leftEyePosition={eyePositionsRef.current.leftEye}
        rightEyePosition={eyePositionsRef.current.rightEye}
        noseBridgePosition={eyePositionsRef.current.noseBridge}
        canvasWidth={canvasRef.current?.width}
        canvasHeight={canvasRef.current?.height}
        visible={true}
      />
    );
  }, [glassesVisible, modelScale, canvasRef.current?.width, canvasRef.current?.height]);

  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-center h-screen bg-[#F16B5E]">
      <h1 className="text-xl md:text-2xl text-white tracking-wider mb-10">Face Landmarker 3D Glasses</h1>
      <div className="relative inline-block">
        <video
          ref={videoRef}
          style={{ width: "640px", height: "480px", backgroundColor: "#333" }}
          autoPlay
          playsInline
          muted
        ></video>
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
            width: "640px",
            height: "480px"
          }}
        ></canvas>
        {renderGlasses}
      </div>
      <div className="flex flex-col md:flex-row mt-5 space-x-0 md:space-x-5">
        <button onClick={takeSnapshot} className="bg-[#F16B5E] text-white font-bold py-3 px-10 rounded-full">
          Take Snapshot
        </button>
        <button onClick={toggleGlasses} className="bg-[#F16B5E] text-white font-bold py-3 px-10 rounded-full">
          {glassesVisible ? "Remove Glasses" : "Try Glasses"}
        </button>
        <button onClick={stopWebcam} className="bg-[#F16B5E] text-white font-bold py-3 px-10 rounded-full">
          Stop Webcam
        </button>
        <Link href="/" className="bg-[#F16B5E] text-white font-bold py-3 px-10 rounded-full">
          Home
        </Link>
      </div>
    </div>
  );
}0