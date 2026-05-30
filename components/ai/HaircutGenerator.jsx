"use client";

import { useRef, useState } from "react";
import {
  Download,
  ImagePlus,
  Loader2,
  RotateCcw,
  Scissors,
  Sparkles,
  Upload,
  Wand2
} from "lucide-react";
import { HAIRCUT_STYLES } from "@/lib/haircut-styles";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_INPAINT_SIDE = 512;

function formatFileSize(bytes) {
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10}MB`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read this image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load this image."));
    image.src = dataUrl;
  });
}

function createEstimatedHairMask(width, height) {
  const maskCanvas = document.createElement("canvas");
  const maskContext = maskCanvas.getContext("2d");
  const shapeCanvas = document.createElement("canvas");
  const shapeContext = shapeCanvas.getContext("2d");

  maskCanvas.width = width;
  maskCanvas.height = height;
  shapeCanvas.width = width;
  shapeCanvas.height = height;

  maskContext.fillStyle = "black";
  maskContext.fillRect(0, 0, width, height);

  const centerX = width * 0.5;
  const topY = height * 0.06;
  const leftX = width * 0.28;
  const rightX = width * 0.72;
  const templeY = height * 0.22;
  const foreheadY = height * 0.38;

  shapeContext.fillStyle = "white";
  shapeContext.beginPath();
  shapeContext.moveTo(centerX, topY);
  shapeContext.bezierCurveTo(width * 0.36, height * 0.06, leftX, height * 0.13, leftX, templeY);
  shapeContext.bezierCurveTo(leftX, height * 0.3, width * 0.36, foreheadY, centerX, height * 0.34);
  shapeContext.bezierCurveTo(width * 0.64, foreheadY, rightX, height * 0.3, rightX, templeY);
  shapeContext.bezierCurveTo(rightX, height * 0.13, width * 0.64, height * 0.06, centerX, topY);
  shapeContext.closePath();
  shapeContext.fill();

  maskContext.filter = "blur(10px)";
  maskContext.drawImage(shapeCanvas, 0, 0);
  maskContext.filter = "none";

  return maskCanvas.toDataURL("image/png");
}

async function prepareInpaintAssets(file) {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);
  const scale = Math.min(1, MAX_INPAINT_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(64, Math.round(image.naturalWidth * scale));
  const height = Math.max(64, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  return {
    originalImage: canvas.toDataURL("image/png"),
    mask: createEstimatedHairMask(width, height),
    width,
    height
  };
}

export default function HaircutGenerator() {
  const fileInputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [maskUrl, setMaskUrl] = useState("");
  const [imageSize, setImageSize] = useState(null);
  const [resultUrl, setResultUrl] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [pendingStyle, setPendingStyle] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function applyImageFile(file) {
    if (!file) {
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Upload a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError(`Use an image smaller than ${formatFileSize(MAX_IMAGE_SIZE)}.`);
      return;
    }

    setError("");
    setIsPreparing(true);

    try {
      const prepared = await prepareInpaintAssets(file);

      setImageFile(file);
      setPreviewUrl(prepared.originalImage);
      setMaskUrl(prepared.mask);
      setImageSize({ width: prepared.width, height: prepared.height });
      setResultUrl("");
      setSelectedStyle("");
    } catch (prepareError) {
      setError(prepareError.message || "Unable to prepare this image.");
    } finally {
      setIsPreparing(false);
    }
  }

  function handleInputChange(event) {
    applyImageFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    applyImageFile(event.dataTransfer.files?.[0]);
  }

  function resetImage() {
    setImageFile(null);
    setPreviewUrl("");
    setMaskUrl("");
    setImageSize(null);
    setResultUrl("");
    setSelectedStyle("");
    setPendingStyle("");
    setError("");
  }

  async function generateHaircut(styleId) {
    if (!previewUrl || !maskUrl || !imageSize || pendingStyle || isPreparing) {
      return;
    }

    setError("");
    setResultUrl("");
    setSelectedStyle(styleId);
    setPendingStyle(styleId);

    try {
      const response = await fetch("/api/ai/haircut", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          originalImage: previewUrl,
          mask: maskUrl,
          width: imageSize.width,
          height: imageSize.height,
          style: styleId
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to generate this haircut.");
      }

      setResultUrl(data.imageUrl);
    } catch (requestError) {
      setError(requestError.message || "Unable to generate this haircut.");
      setSelectedStyle("");
    } finally {
      setPendingStyle("");
    }
  }

  const activeStyle = pendingStyle || selectedStyle;
  const selectedLabel =
    HAIRCUT_STYLES.find((style) => style.id === activeStyle)?.label || "Haircut preview";

  return (
    <main className="haircut-ai-page">
      <section className="haircut-ai-shell" aria-labelledby="haircut-ai-title">
        <div className="haircut-ai-head">
          <div>
            <span className="eyebrow">Hairforce AI</span>
            <h1 id="haircut-ai-title">Try a haircut before the chair</h1>
          </div>
          <p>Upload a portrait, pick a cut, and compare the AI preview.</p>
        </div>

        <div className="haircut-ai-workspace">
          <div className="haircut-ai-control-panel">
            <div className="haircut-ai-panel-head">
              <span className="haircut-ai-step">01</span>
              <div>
                <h2>Reference image</h2>
                <p>{imageFile ? imageFile.name : "JPG, PNG, or WEBP"}</p>
              </div>
            </div>

            <button
              className={`haircut-ai-upload ${previewUrl ? "has-preview" : ""} ${isDragging ? "is-dragging" : ""}`}
              type="button"
              onClick={openFilePicker}
              onDragEnter={() => setIsDragging(true)}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Uploaded reference" />
              ) : isPreparing ? (
                <span className="haircut-ai-upload-empty">
                  <Loader2 className="is-spinning" aria-hidden="true" />
                  <strong>Preparing image</strong>
                  <small>Creating the inpaint mask</small>
                </span>
              ) : (
                <span className="haircut-ai-upload-empty">
                  <ImagePlus aria-hidden="true" />
                  <strong>Choose a portrait</strong>
                  <small>Drop an image here or browse files</small>
                </span>
              )}
            </button>

            <input
              ref={fileInputRef}
              className="haircut-ai-file-input"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              onChange={handleInputChange}
            />

            <div className="haircut-ai-upload-actions">
              <button className="haircut-ai-ghost-button" type="button" onClick={openFilePicker}>
                <Upload aria-hidden="true" />
                <span>{imageFile ? "Change image" : "Upload image"}</span>
              </button>
              {imageFile ? (
                <button className="haircut-ai-ghost-button" type="button" onClick={resetImage}>
                  <RotateCcw aria-hidden="true" />
                  <span>Reset</span>
                </button>
              ) : null}
            </div>

            {maskUrl ? (
              <div className="haircut-ai-mask-preview">
                <div>
                  <strong>Hair mask</strong>
                  <small>White area will be regenerated.</small>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={maskUrl} alt="Estimated hair mask" />
              </div>
            ) : null}

            <div className="haircut-ai-style-section">
              <div className="haircut-ai-panel-head">
                <span className="haircut-ai-step">02</span>
                <div>
                  <h2>Haircut</h2>
                  <p>Choose one style</p>
                </div>
              </div>

              <div className="haircut-ai-styles" aria-label="Haircut styles">
                {HAIRCUT_STYLES.map((style) => {
                  const isActive = activeStyle === style.id;
                  const isPending = pendingStyle === style.id;

                  return (
                    <button
                      className={`haircut-ai-style-button ${isActive ? "is-active" : ""}`}
                      type="button"
                      key={style.id}
                      disabled={!previewUrl || !maskUrl || Boolean(pendingStyle) || isPreparing}
                      onClick={() => generateHaircut(style.id)}
                    >
                      {isPending ? <Loader2 className="is-spinning" aria-hidden="true" /> : <Scissors aria-hidden="true" />}
                      <span>
                        <strong>{style.label}</strong>
                        <small>{style.helper}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error ? (
              <p className="haircut-ai-status is-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="haircut-ai-result-panel">
            <div className="haircut-ai-panel-head">
              <span className="haircut-ai-step">03</span>
              <div>
                <h2>Generated preview</h2>
                <p>{resultUrl ? selectedLabel : "Pollinations Flux"}</p>
              </div>
            </div>

            <div className={`haircut-ai-result-frame ${resultUrl ? "has-result" : ""}`}>
              {pendingStyle ? (
                <div className="haircut-ai-loading">
                  <Loader2 className="is-spinning" aria-hidden="true" />
                  <strong>Generating {selectedLabel}</strong>
                  <span>Keeping the edit focused on hair only.</span>
                </div>
              ) : resultUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resultUrl} alt={`${selectedLabel} generated preview`} />
              ) : (
                <div className="haircut-ai-result-empty">
                  <Sparkles aria-hidden="true" />
                  <strong>Preview appears here</strong>
                  <span>Select a haircut after uploading an image.</span>
                </div>
              )}
            </div>

            <div className="haircut-ai-result-actions">
              <span>
                <Wand2 aria-hidden="true" />
                Only the haircut is requested from the model.
              </span>
              {resultUrl ? (
                <a className="haircut-ai-download" href={resultUrl} download={`hairforce-${selectedStyle}.png`}>
                  <Download aria-hidden="true" />
                  <span>Download</span>
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
