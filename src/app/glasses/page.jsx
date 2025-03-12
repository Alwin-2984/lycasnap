"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import Link from "next/link";
import Glasses3D from "../../components/Glasses3D";

// New AdjustmentPanel component
function AdjustmentPanel({ adjustmentSettings, setAdjustmentSettings }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setAdjustmentSettings((prev) => ({
      ...prev,
      [name]: parseFloat(value),
    }));
  };

  return (
    <div className="adjustment-panel bg-white p-4 rounded mt-5 shadow-md h-96 overflow-auto">
      <h2 className="text-lg font-bold mb-3">Adjustment Settings</h2>
      <div className="mb-3">
        <label>
          Rotation Sensitivity: {adjustmentSettings.rotationSensitivity}
        </label>
        <input
          type="range"
          name="rotationSensitivity"
          min="-100"
          max="100"
          step="0.1"
          value={adjustmentSettings.rotationSensitivity}
          onChange={handleChange}
          className="w-full"
        />
      </div>
      <div className="mb-3">
        <label>
          Coordinate Factor: {adjustmentSettings.coordinateFactor}
        </label>
        <input
          type="range"
          name="coordinateFactor"
          min="-100"
          max="100"
          step="0.1"
          value={adjustmentSettings.coordinateFactor}
          onChange={handleChange}
          className="w-full"
        />
      </div>

      <div className="mb-3">
        <label>
          Horizontal Sensitivity: {adjustmentSettings.horizontalSensitivity}
        </label>
        <input
          type="range"
          name="horizontalSensitivity"
          min="-100"
          max="100"
          step="0.1"
          value={adjustmentSettings.horizontalSensitivity}
          onChange={handleChange}
          className="w-full"
        />
      </div>

      <div className="mb-3">
        <label>
          Vertical Sensitivity: {adjustmentSettings.verticalSensitivity}
        </label>
        <input
          type="range"
          name="verticalSensitivity"
          min="-100"
          max="100"
          step="0.1"
          value={adjustmentSettings.verticalSensitivity}
          onChange={handleChange}
          className="w-full"
        />
      </div>

      <div className="mb-3">
        <label>X Offset: {adjustmentSettings.xOffset}</label>
        <input
          type="range"
          name="xOffset"
         min="-100"
          max="100"
          step="0.1"
          value={adjustmentSettings.xOffset}
          onChange={handleChange}
          className="w-full"
        />
      </div>

      <div className="mb-3">
        <label>Y Offset: {adjustmentSettings.yOffset}</label>
        <input
          type="range"
          name="yOffset"
          min="-100"
          max="100"
          step="0.1"
          value={adjustmentSettings.yOffset}
          onChange={handleChange}
          className="w-full"
        />
      </div>

      <div className="mb-3">
        <label>Z Offset: {adjustmentSettings.zOffset}</label>
        <input
          type="range"
          name="zOffset"
          min="-100"
          max="100"
          step="0.1"
          value={adjustmentSettings.zOffset}
          onChange={handleChange}
          className="w-full"
        />
      </div>

      <div className="mb-3">
        <label>Yaw Multiplier: {adjustmentSettings.yawMultiplier}</label>
        <input
          type="range"
          name="yawMultiplier"
        min="-100"
          max="100"
          step="0.1"
          value={adjustmentSettings.yawMultiplier}
          onChange={handleChange}
          className="w-full"
        />
      </div>

      <div className="mb-3">
        <label>Tilt Multiplier: {adjustmentSettings.tiltMultiplier}</label>
        <input
          type="range"
          name="tiltMultiplier"
         min="-100"
          max="100"
          step="0.1"
          value={adjustmentSettings.tiltMultiplier}
          onChange={handleChange}
          className="w-full"
        />
      </div>

      <div className="mb-3">
        <label>Scale Divider: {adjustmentSettings.scaleDivider}</label>
        <input
          type="range"
          name="scaleDivider"
         min="-100"
          max="100"
          step="0.1"
          value={adjustmentSettings.scaleDivider}
          onChange={handleChange}
          className="w-full"
        />
      </div>

      <div>
        <label>Scale Multiplier: {adjustmentSettings.scaleMultiplier}</label>
        <input
          type="range"
          name="scaleMultiplier"
          min="-100"
          max="100"
          step="0.1"
          value={adjustmentSettings.scaleMultiplier}
          onChange={handleChange}
          className="w-full"
        />
      </div>
    </div>
  );
}

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
  const faceLandmarkerLoadedRef = useRef(false);

  // Pre-allocate objects for 3D transformations
  const modelPositionRef = useRef({ x: 0, y: 0, z: 0 });
  const modelRotationRef = useRef({ x: 0, y: 0, z: 0 });
  const eyePositionsRef = useRef({
    leftEye: { x: 0, y: 0, z: 0 },
    rightEye: { x: 0, y: 0, z: 0 },
    noseBridge: { x: 0, y: 0, z: 0 },
  });

  // State for UI control only
  const [glassesVisible, setGlassesVisible] = useState(true);
  const [modelScale, setModelScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [adjustmentSettings, setAdjustmentSettings] = useState({
    coordinateFactor: 5,
    horizontalSensitivity: 1,
    verticalSensitivity: 0.7,
    xOffset: 0,
    yOffset: 0,
    zOffset: 0,
    yawMultiplier: 3.0,
    tiltMultiplier: 1.0,
    rotationSensitivity: 1.0, // New parameter for overall rotation sensitivity
    scaleDivider: 20,
    scaleMultiplier: 5,
  });
  
  const adjustmentSettingsRef = useRef(adjustmentSettings);
  
  useEffect(() => {
    adjustmentSettingsRef.current = adjustmentSettings;
  }, [adjustmentSettings]);




  useEffect(() => {
    console.log("Component mounted, initializing...");
    initializeFaceLandmarker();
    window.addEventListener("resize", handleResize);

    return () => {
      console.log("Component unmounting, cleaning up...");
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      stopWebcam();
    };
  }, []);

  // Start the webcam when FaceLandmarker is loaded
  useEffect(() => {
    if (faceLandmarkerLoadedRef.current) {
      console.log("FaceLandmarker loaded, starting webcam...");
      startWebcam();
    }
  }, [faceLandmarkerLoadedRef.current]);

  // Memoized resize handler
  const handleResize = useCallback(() => {
    if (
      canvasRef.current &&
      videoRef.current &&
      videoRef.current.videoWidth > 0
    ) {
      console.log(
        "Resizing canvas to match video dimensions:",
        videoRef.current.videoWidth,
        videoRef.current.videoHeight
      );
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
    }
  }, []);

  // Initialize the FaceLandmarker
  const initializeFaceLandmarker = async () => {
    try {
      console.log("Loading FaceLandmarker...");
      setIsLoading(true);

      const filesetResolver = await FilesetResolver.forVisionTasks(
        "/models/wasm"
      );
      console.log("FilesetResolver loaded");

      const flInstance = await FaceLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath: "/models/face_landmarker.task",
            delegate: "GPU",
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1,
        }
      );

      console.log("FaceLandmarker instance created successfully");
      faceLandmarkerRef.current = flInstance;
      faceLandmarkerLoadedRef.current = true;

      if (canvasRef.current) {
        ctxRef.current = canvasRef.current.getContext("2d", { alpha: false });
        console.log("Canvas context initialized");
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error initializing FaceLandmarker:", error);
      setIsLoading(false);
    }
  };

  // Start the webcam and detection loop
  const startWebcam = async () => {
    console.log("Starting webcam...");
    if (!faceLandmarkerRef.current) {
      console.error("FaceLandmarker not loaded yet");
      alert("Face Landmarker is still loading. Please try again.");
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      };

      console.log("Requesting media with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Stream obtained:", stream);

      if (!videoRef.current) {
        console.error("Video element reference lost");
        return;
      }

      videoRef.current.srcObject = stream;
      videoRef.current.style.display = "block";

      videoRef.current.onloadedmetadata = async () => {
        console.log(
          "Video metadata loaded, dimensions:",
          videoRef.current.videoWidth,
          videoRef.current.videoHeight
        );

        try {
          await videoRef.current.play();
          console.log("Video playback started");

          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            console.log(
              "Canvas sized to:",
              canvasRef.current.width,
              canvasRef.current.height
            );
          }

          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
          console.log("Starting detection loop...");
          detect();
        } catch (err) {
          console.error("Error playing video:", err);
        }
      };
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  // Optimized detection loop using the adjustable settings
  const detect = useCallback(() => {
    if (
      !faceLandmarkerRef.current ||
      !ctxRef.current ||
      !videoRef.current ||
      videoRef.current.videoWidth === 0 ||
      videoRef.current.videoHeight === 0
    ) {
      console.log("Detection prerequisites not met, retrying...");
      animationRef.current = requestAnimationFrame(detect);
      return;
    }
  
    // Run face landmark detection
    const results = faceLandmarkerRef.current.detectForVideo(
      videoRef.current,
      performance.now()
    );
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
  
    if (!canvas) {
      console.error("Canvas reference lost");
      return;
    }
  
    // Clear canvas and draw current video frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
  
    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
      const landmarks = results.faceLandmarks[0];
      faceLandmarksRef.current = landmarks;
  
      if (glassesVisible) {
        // Key landmarks
        const leftEye = landmarks[468];
        const rightEye = landmarks[473];
        const noseBridge = landmarks[168];
  
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
  
        // Draw key landmarks (as before)...
        // ...
  
        // Retrieve the latest adjustment settings from the ref
        const {
          coordinateFactor,
          horizontalSensitivity,
          verticalSensitivity,
          xOffset,
          yOffset,
          zOffset,
          yawMultiplier,
          tiltMultiplier,
          rotationSensitivity, // Use the new parameter
          scaleDivider,
          scaleMultiplier,
        } = adjustmentSettingsRef.current;
  
        const threeLeftEyeX =
          (leftEye.x * 2 - 1) * coordinateFactor * horizontalSensitivity;
        const threeLeftEyeY =
          -(leftEye.y * 2 - 1) * coordinateFactor * verticalSensitivity;
        const threeRightEyeX =
          (rightEye.x * 2 - 1) * coordinateFactor * horizontalSensitivity;
        const threeRightEyeY =
          -(rightEye.y * 2 - 1) * coordinateFactor * verticalSensitivity;
        const threeNoseBridgeX =
          (noseBridge.x * 2 - 1) * coordinateFactor * horizontalSensitivity;
        const threeNoseBridgeY =
          -(noseBridge.y * 2 - 1) * coordinateFactor * verticalSensitivity;
  
        // Calculate distance and update scale
        const xDiff = rightEye.x - leftEye.x;
        const yDiff = rightEye.y - leftEye.y;
        const eyeDistance = Math.sqrt(
          (xDiff * canvasWidth) ** 2 + (yDiff * canvasHeight) ** 2
        );
        eyeDistanceRef.current = eyeDistance;
        const scale = (eyeDistance / scaleDivider) * scaleMultiplier;
        if (Math.abs(scale - modelScale) > 0.05) {
          setModelScale(scale);
        }
  
        // Calculate rotation
        const tiltAngle = Math.atan2(
          yDiff * canvasHeight,
          xDiff * canvasWidth
        );
        const yawAngle = (rightEye.z - leftEye.z) * yawMultiplier;
  
        // Update transformation refs using offsets
        modelPositionRef.current.x = threeNoseBridgeX + xOffset;
        modelPositionRef.current.y = threeNoseBridgeY + yOffset;
        modelPositionRef.current.z = zOffset;
  
        // modelRotationRef.current.x = 0;
        // modelRotationRef.current.y = yawAngle;
        // modelRotationRef.current.z = -tiltAngle * tiltMultiplier;


// Apply rotation sensitivity
modelRotationRef.current.x = 0;
modelRotationRef.current.y = yawAngle * rotationSensitivity;
modelRotationRef.current.z = -tiltAngle * tiltMultiplier * rotationSensitivity;
        // Update eye positions
        eyePositionsRef.current.leftEye = {
          x: threeLeftEyeX,
          y: threeLeftEyeY,
          z: 0,
        };
        eyePositionsRef.current.rightEye = {
          x: threeRightEyeX,
          y: threeRightEyeY,
          z: 0,
        };
        eyePositionsRef.current.noseBridge = {
          x: threeNoseBridgeX,
          y: threeNoseBridgeY,
          z: 0,
        };
      }
    } else {
      faceLandmarksRef.current = null;
    }
  
    animationRef.current = requestAnimationFrame(detect);
  }, [glassesVisible, modelScale]);
  

  // Memoized event handlers
  const toggleGlasses = useCallback(() => {
    setGlassesVisible((prev) => !prev);
    console.log("Glasses visibility toggled");
  }, []);

  const takeSnapshot = useCallback(() => {
    if (!canvasRef.current || !ctxRef.current) return;
    console.log("Taking snapshot...");
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "snapshot.png";
    link.click();
    console.log("Snapshot downloaded");
  }, []);

  const stopWebcam = useCallback(() => {
    console.log("Stopping webcam...");
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => {
        track.stop();
        console.log("Track stopped:", track.kind);
      });
      videoRef.current.srcObject = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      console.log("Animation frame canceled");
    }
  }, []);

  // Render the 3D glasses only if landmarks are detected and glasses are visible
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
  }, [
    glassesVisible,
    modelScale,
    canvasRef.current?.width,
    canvasRef.current?.height,
  ]);

  return (
    <div className="relative overflow-auto flex flex-col items-center justify-center h-screen bg-[#F16B5E]">
      <h1 className="text-xl md:text-2xl text-white tracking-wider mb-10">
        Face Landmarker 3D Glasses
      </h1>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="text-white text-xl">
            Loading Face Landmarker...
          </div>
        </div>
      )}

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
            height: "480px",
          }}
        ></canvas>
        {renderGlasses}
      </div>
      <AdjustmentPanel
        adjustmentSettings={adjustmentSettings}
        setAdjustmentSettings={setAdjustmentSettings}
      />
      <div className="flex flex-col md:flex-row mt-5 space-x-0 md:space-x-5">
        <button
          onClick={takeSnapshot}
          className="bg-[#F16B5E] text-white font-bold py-3 px-10 rounded-full"
        >
          Take Snapshot
        </button>
        <button
          onClick={toggleGlasses}
          className="bg-[#F16B5E] text-white font-bold py-3 px-10 rounded-full"
        >
          {glassesVisible ? "Remove Glasses" : "Try Glasses"}
        </button>
        <button
          onClick={() => {
            stopWebcam();
            startWebcam();
          }}
          className="bg-[#F16B5E] text-white font-bold py-3 px-10 rounded-full"
        >
          Restart Camera
        </button>
        <Link
          href="/"
          className="bg-[#F16B5E] text-white font-bold py-3 px-10 rounded-full"
        >
          Home
        </Link>

      {/* Render the adjustment panel */}
     
    </div>
      </div>
  );
}
