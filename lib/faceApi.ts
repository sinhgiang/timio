// Client-side only — never import at module level in server components.

let modelsLoading: Promise<void> | null = null;

export async function ensureModels() {
  if (modelsLoading) return modelsLoading;

  modelsLoading = (async () => {
    const faceapi = await import("@vladmandic/face-api");
    const MODEL_PATH = "/models";

    await Promise.all([
      faceapi.nets.tinyFaceDetector.isLoaded
        ? Promise.resolve()
        : faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
      faceapi.nets.faceLandmark68Net.isLoaded
        ? Promise.resolve()
        : faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
      faceapi.nets.faceRecognitionNet.isLoaded
        ? Promise.resolve()
        : faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
    ]);

    // Warmup: chạy 1 lần detection trên canvas trắng để TF.js khởi tạo WebGL backend
    // — các lần sau sẽ nhanh hơn nhiều
    const warmup = document.createElement("canvas");
    warmup.width = 224;
    warmup.height = 224;
    try {
      await faceapi.detectSingleFace(
        warmup,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224 })
      );
    } catch {
      // ignore warmup errors (expected: no face found on blank canvas)
    }
  })();

  return modelsLoading;
}

/**
 * Chụp frame hiện tại của video → trả về canvas.
 * Gọi hàm này TRƯỚC khi unmount video (trước setPhase).
 */
export function captureFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(video, 0, 0);
  return canvas;
}

/**
 * Extract 128-dim face descriptor từ canvas/video.
 * Timeout 12 giây để tránh hang vĩnh viễn.
 */
export async function extractDescriptor(
  input: HTMLVideoElement | HTMLCanvasElement
): Promise<number[] | null> {
  await ensureModels();
  const faceapi = await import("@vladmandic/face-api");

  const detectionPromise = faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Timeout: nhận diện quá 12 giây")), 12000)
  );

  const result = await Promise.race([detectionPromise, timeoutPromise]);
  if (!result) return null;
  return Array.from(result.descriptor);
}

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Detect tất cả khuôn mặt trong video, trả về bounding box của mặt LỚN NHẤT.
 * Dùng cho auto-zoom trong FaceCapture.
 */
export async function detectFaceBox(video: HTMLVideoElement): Promise<FaceBox | null> {
  await ensureModels();
  const faceapi = await import("@vladmandic/face-api");

  const detections = await faceapi.detectAllFaces(
    video,
    new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
  );

  if (!detections.length) return null;

  // Chọn mặt có diện tích lớn nhất (gần camera nhất / chủ thể chính)
  const largest = detections.reduce((best, d) =>
    d.box.area > best.box.area ? d : best
  );

  return {
    x: largest.box.x,
    y: largest.box.y,
    width: largest.box.width,
    height: largest.box.height,
  };
}

function euclidean(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

export interface EmployeeFaceData {
  id: string;
  name: string;
  descriptors: number[][];
}

export function findBestMatch(
  descriptor: number[],
  employees: EmployeeFaceData[],
  threshold = 0.5
): { id: string; name: string; distance: number } | null {
  let best: { id: string; name: string; distance: number } | null = null;

  for (const emp of employees) {
    for (const stored of emp.descriptors) {
      const dist = euclidean(descriptor, stored);
      if (!best || dist < best.distance) {
        best = { id: emp.id, name: emp.name, distance: dist };
      }
    }
  }

  return best && best.distance < threshold ? best : null;
}
