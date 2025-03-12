"use client";

import React, { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import Link from "next/link";
import Glasses3D from "../../components/Glasses3D";

export default function VirtualTryOnComponent() {
  // Refs for video and canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // State for FaceLandmarker and canvas context
  const [faceLandmarker, setFaceLandmarker] = useState(null);
  const [ctx, setCtx] = useState(null);

  // State to control webcam loop
  const [webcamRunning, setWebcamRunning] = useState(false);

  // State for glasses visibility and detected landmarks
  const [glassesVisible, setGlassesVisible] = useState(true);
  const [faceLandmarks, setFaceLandmarks] = useState(null);

  // Add these new states for 3D model transformations
  const [modelPosition, setModelPosition] = useState(null);
  const [modelRotation, setModelRotation] = useState(null);
  const [modelScale, setModelScale] = useState(null);
  const [eyePositions, setEyePositions] = useState({
    leftEye: null,
    rightEye: null,
    noseBridge: null
  });

  useEffect(() => {
    initializeFaceLandmarker();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // When FaceLandmarker is ready, start the webcam.
  useEffect(() => {
    if (faceLandmarker) {
      startWebcam();
    }
  }, [faceLandmarker]);

  const handleResize = () => {
    if (canvasRef.current && videoRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
    }
  };

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
      setFaceLandmarker(flInstance);
      console.log("FaceLandmarker initialized:", flInstance);

      if (canvasRef.current) {
        setCtx(canvasRef.current.getContext("2d"));
        console.log("Canvas context initialized");
      }
    } catch (error) {
      console.error("Error initializing FaceLandmarker:", error);
    }
  };

  // Start the webcam and detection loop
  const startWebcam = async () => {
    console.log("Attempting to start webcam...");
    if (!faceLandmarker) {
      alert("Face Landmarker is still loading. Please try again.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.style.display = "block";
      setWebcamRunning(true);
      console.log("Webcam stream started.");

      videoRef.current.oncanplay = async () => {
        console.log("Video can play now.");
        console.log("Video dimensions:", videoRef.current.videoWidth, videoRef.current.videoHeight);
        try {
          await videoRef.current.play();
          console.log("Video playing:", !videoRef.current.paused);
        } catch (err) {
          console.error("Error playing video:", err);
        }
        detect();
      };
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  // Detection loop: detect face landmarks and update state
  const detect = async () => {
    if (!faceLandmarker || !ctx || !videoRef.current) {
      requestAnimationFrame(detect);
      return;
    }
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      requestAnimationFrame(detect);
      return;
    }

    // Update canvas dimensions if needed.
    if (
      canvasRef.current.width !== videoRef.current.videoWidth ||
      canvasRef.current.height !== videoRef.current.videoHeight
    ) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
    }

    // Run face landmark detection.
    const results = faceLandmarker.detectForVideo(videoRef.current, performance.now());

    // Clear canvas and draw current video frame.
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

    // Update face landmarks for 3D glasses
    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
      setFaceLandmarks(results.faceLandmarks);
      
      // Draw all facial landmarks
      const landmarks = results.faceLandmarks[0];
      
      // Draw all landmarks as small white dots
      landmarks.forEach((landmark, index) => {
        ctx.beginPath();
        ctx.arc(
          landmark.x * canvasRef.current.width,
          landmark.y * canvasRef.current.height,
          1.5, 0, 2 * Math.PI
        );
        
        // Special colors for key landmarks
        if (index === 39) {
          // Left eye
          ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        } else if (index === 263) {
          // Right eye
          ctx.fillStyle = 'rgba(0, 0, 255, 0.7)';
        } else if (index === 168) {
          // Nose bridge
          ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
        } else {
          // All other landmarks
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        }
        
        ctx.fill();
      });
      
      // Draw larger indicators for key points - using actual pupil centers
const leftEye = landmarks[468];  // Actual pupil center for left eye
const rightEye = landmarks[473]; // Actual pupil center for right eye
const noseBridge = landmarks[168]; // Keep the same nose bridge point
      
      // Draw left eye dot (red)
      ctx.beginPath();
      ctx.arc(
        leftEye.x * canvasRef.current.width, 
        leftEye.y * canvasRef.current.height, 
        5, 0, 2 * Math.PI
      );
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.fill();
      
      // Draw right eye dot (blue)
      ctx.beginPath();
      ctx.arc(
        rightEye.x * canvasRef.current.width, 
        rightEye.y * canvasRef.current.height, 
        5, 0, 2 * Math.PI
      );
      ctx.fillStyle = 'rgba(0, 0, 255, 0.7)';
      ctx.fill();
      
      // Draw nose bridge dot (green)
      ctx.beginPath();
      ctx.arc(
        noseBridge.x * canvasRef.current.width, 
        noseBridge.y * canvasRef.current.height, 
        5, 0, 2 * Math.PI
      );
      ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
      ctx.fill();
      
      // Calculate 3D transformations (moved from Glasses3D component)
      const factor = 5; // Same as conversion.factor in previous implementation
      
      // Convert to Three.js coordinates
      const threeLeftEyeX = (leftEye.x * 2 - 1) * factor;
      const threeLeftEyeY = -(leftEye.y * 2 - 1) * factor;
      const threeRightEyeX = (rightEye.x * 2 - 1) * factor;
      const threeRightEyeY = -(rightEye.y * 2 - 1) * factor;
      const threeNoseBridgeX = (noseBridge.x * 2 - 1) * factor;
      const threeNoseBridgeY = -(noseBridge.y * 2 - 1) * factor;
      
      // Calculate distance, scale, angles
      const eyeDistance = Math.sqrt(
        Math.pow((rightEye.x - leftEye.x) * canvasRef.current.width, 2) +
        Math.pow((rightEye.y - leftEye.y) * canvasRef.current.height, 2)
      );
      
      // Calculate scale and rotation
      const scale = (eyeDistance / 20) * 5;
      const tiltAngle = Math.atan2(
        (rightEye.y - leftEye.y) * canvasRef.current.height,
        (rightEye.x - leftEye.x) * canvasRef.current.width
      );
      const eyesZDiff = rightEye.z - leftEye.z;
      const yawAngle = eyesZDiff * 3.0;
      
      // Update states with calculated values
      setModelPosition({
        x: threeNoseBridgeX, // Same as noseBridgeOffset.x
        y: threeNoseBridgeY,
        z: 0 // Same as glasses.z
      });
      
      setModelRotation({
        x: 0,
        y: yawAngle,
        z: -tiltAngle
      });
      
      setModelScale(scale);
      
      setEyePositions({
        leftEye: {
          x: threeLeftEyeX,
          y: threeLeftEyeY,
          z: 0 // Same as markers.z
        },
        rightEye: {
          x: threeRightEyeX,
          y: threeRightEyeY,
          z: 0
        },
        noseBridge: {
          x: threeNoseBridgeX,
          y: threeNoseBridgeY,
          z: 0
        }
      });
    } else {
      setFaceLandmarks(null);
      setModelPosition(null);
      setModelRotation(null);
      setModelScale(null);
      setEyePositions({ leftEye: null, rightEye: null, noseBridge: null });
    }

    requestAnimationFrame(detect);
  };

  // Toggle glasses visibility.
  const toggleGlasses = () => {
    setGlassesVisible(!glassesVisible);
    console.log("Glasses visibility toggled to", !glassesVisible);
  };

  // Take a snapshot of the current canvas.
  const takeSnapshot = () => {
    if (!canvasRef.current || !ctx) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "snapshot.png";
    link.click();
  };

  // Stop the webcam.
  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    setWebcamRunning(false);
    console.log("Webcam stopped.");
  };

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
        {/* 3D Glasses Overlay */}
        {faceLandmarks && modelPosition && (
  <Glasses3D
    modelPosition={modelPosition}
    modelRotation={modelRotation}
    modelScale={modelScale}
    leftEyePosition={eyePositions.leftEye}
    rightEyePosition={eyePositions.rightEye}
    noseBridgePosition={eyePositions.noseBridge}
    canvasWidth={canvasRef.current?.width}
    canvasHeight={canvasRef.current?.height}
    visible={glassesVisible}
  />
)}
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
}
