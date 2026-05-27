# VidTube — Complete Step-by-Step Build Guide
### From Monolith → Production-Grade Microservices Platform

---

## HOW TO USE THIS GUIDE

This guide is split into **8 phases**, each building on the last. Every phase has:
- **Goal** — what you'll have working at the end
- **Steps** — exact things to do, in order
- **Code** — copy-paste ready snippets tied to YOUR existing files
- **Test** — how to verify it works before moving on

You already have: User, Video, Comment, Like, Subscription, Playlist, Tweet controllers + MongoDB + Cloudinary + JWT auth + Multer middleware.

> ⚠️ Never skip a phase. Each one is a prerequisite for the next.

---

## PHASE 0 — Developer Environment Setup
**Goal:** Consistent local environment that mirrors production. Time: ~2 hours.

### Step 0.1 — Install Required Tools
```bash
# Node.js 22 LTS
nvm install 22 && nvm use 22

# pnpm (faster than npm, required for monorepo)
npm install -g pnpm@9

# Docker Desktop (for running MongoDB, Redis, Kafka locally)
# Download from: https://www.docker.com/products/docker-desktop

# Turborepo (monorepo task runner)
pnpm add -g turbo

# FFmpeg (for transcoding)
# macOS:
brew install ffmpeg
# Ubuntu/Debian:
sudo apt install ffmpeg
# Windows: download from https://ffmpeg.org/download.html

# Verify everything
node --version    # v22.x.x
pnpm --version   # 9.x.x
docker --version  # Docker Desktop 4.x
ffmpeg -version  # ffmpeg version 7.x
```

### Step 0.2 — Convert Repo to Monorepo Structure
Your current repo has `backend/` and `frontend/`. Restructure it:

```bash
# From your repo root
mkdir -p services/user-service
mkdir -p services/video-service
mkdir -p services/comment-service
mkdir -p services/engagement-service
mkdir -p services/playlist-service
mkdir -p services/tweet-service
mkdir -p services/notification-service
mkdir -p services/transcoding-service
mkdir -p services/livestream-service
mkdir -p packages/shared-utils
mkdir -p packages/event-schemas
mkdir -p api-gateway
mkdir -p infrastructure/k8s
mkdir -p infrastructure/docker

# Move existing backend into user-service for now
# (we'll split it out service-by-service in later phases)
cp -r backend/* services/user-service/
```

### Step 0.3 — Root package.json (Turborepo)
Create `package.json` at repo root:

```json
{
  "name": "vidtube",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - "services/*"
  - "packages/*"
  - "api-gateway"
  - "frontend"
```

Create `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "outputs": ["dist/**"] },
    "test": { "outputs": [] }
  }
}
```

### Step 0.4 — docker-compose.yml for Local Dev
Create `infrastructure/docker/docker-compose.dev.yml`:

```yaml
version: "3.9"
services:
  # One MongoDB per service (mirrors production isolation)
  mongo-users:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: ["mongo-users-data:/data/db"]

  mongo-videos:
    image: mongo:7
    ports: ["27018:27017"]
    volumes: ["mongo-videos-data:/data/db"]

  mongo-comments:
    image: mongo:7
    ports: ["27019:27017"]

  mongo-engagement:
    image: mongo:7
    ports: ["27020:27017"]

  mongo-playlists:
    image: mongo:7
    ports: ["27021:27017"]

  mongo-tweets:
    image: mongo:7
    ports: ["27022:27017"]

  mongo-livestreams:
    image: mongo:7
    ports: ["27023:27017"]

  # Redis (cache + chat pub/sub + job queues)
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --appendonly yes

  # Kafka + Zookeeper (message broker)
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on: [zookeeper]
    ports: ["9092:9092"]
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  # Kafka UI (visual dashboard — optional but very helpful)
  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports: ["8090:8080"]
    environment:
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
    depends_on: [kafka]

volumes:
  mongo-users-data:
  mongo-videos-data:
```

```bash
# Start all local infrastructure
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d

# Verify
docker ps  # should show 9 containers running
```

**✅ Phase 0 Complete:** All infrastructure running locally.

---

## PHASE 1 — Extract shared-utils Package
**Goal:** All your existing utilities (ApiError, ApiResponse, asyncHandler) live in one shared package used by every service. Time: ~3 hours.

### Step 1.1 — Create the Package

```bash
cd packages/shared-utils
pnpm init
```

`packages/shared-utils/package.json`:
```json
{
  "name": "@vidtube/shared-utils",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    "./ApiError": "./src/ApiError.js",
    "./ApiResponse": "./src/ApiResponse.js",
    "./asyncHandler": "./src/asyncHandler.js",
    "./verifyJWT": "./src/verifyJWT.js",
    "./logger": "./src/logger.js"
  }
}
```

### Step 1.2 — Copy Your Existing Utils
Copy your existing `backend/src/utils/ApiError.js`, `ApiResponse.js`, `asyncHandler.js` into `packages/shared-utils/src/` unchanged. They already work — no modifications needed.

### Step 1.3 — Add verifyJWT (new shared utility)
`packages/shared-utils/src/verifyJWT.js`:
```javascript
import jwt from "jsonwebtoken";
import { ApiError } from "./ApiError.js";

export const verifyJWT = (token) => {
  try {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    throw new ApiError(401, "Invalid or expired access token");
  }
};
```

### Step 1.4 — Add Structured Logger (new)
`packages/shared-utils/src/logger.js`:
```javascript
// Structured JSON logging — every service uses this
export const logger = {
  info: (msg, meta = {}) => console.log(JSON.stringify({
    level: "info", message: msg,
    service: process.env.SERVICE_NAME,
    timestamp: new Date().toISOString(), ...meta
  })),
  error: (msg, meta = {}) => console.error(JSON.stringify({
    level: "error", message: msg,
    service: process.env.SERVICE_NAME,
    timestamp: new Date().toISOString(), ...meta
  })),
  warn: (msg, meta = {}) => console.warn(JSON.stringify({
    level: "warn", message: msg,
    service: process.env.SERVICE_NAME,
    timestamp: new Date().toISOString(), ...meta
  }))
};
```

### Step 1.5 — Add Event Schemas Package
`packages/event-schemas/src/index.js`:
```javascript
// These are the Kafka event shapes ALL services must follow
export const VideoEvents = {
  UPLOADED:           "video.uploaded",
  TRANSCODED:         "video.transcoded",
  TRANSCODING_FAILED: "video.transcoding_failed",
  PUBLISHED:          "video.published",
  DELETED:            "video.deleted"
};

export const UserEvents = {
  REGISTERED: "user.registered",
  DELETED:    "user.deleted"
};

export const LiveStreamEvents = {
  STARTED:    "stream.started",
  ENDED:      "stream.ended",
  SCHEDULED:  "stream.scheduled"
};

export const EngagementEvents = {
  VIDEO_LIKED:         "video.liked",
  CHANNEL_SUBSCRIBED:  "channel.subscribed"
};
```

### Step 1.6 — Reference in Services
In each service's `package.json`, add:
```json
{
  "dependencies": {
    "@vidtube/shared-utils": "workspace:*",
    "@vidtube/event-schemas": "workspace:*"
  }
}
```

Then in your service code replace:
```javascript
// OLD (in each service)
import { ApiError } from "../utils/ApiError.js";

// NEW
import { ApiError } from "@vidtube/shared-utils/ApiError";
```

```bash
# Install workspace deps from repo root
pnpm install
```

**✅ Phase 1 Complete:** One source of truth for all shared code.

---

## PHASE 2 — API Gateway
**Goal:** Single entry point. All traffic routes through here. JWT validated once. Time: ~1 day.

### Step 2.1 — Initialize Gateway

```bash
cd api-gateway
pnpm init
pnpm add express http-proxy-middleware express-rate-limit jsonwebtoken cors
```

### Step 2.2 — Route Config
`api-gateway/src/routes.config.js`:
```javascript
// Maps URL prefixes to downstream services
export const ROUTES = {
  "/api/v1/auth":          "http://localhost:3001",  // user-service
  "/api/v1/users":         "http://localhost:3001",
  "/api/v1/videos":        "http://localhost:3002",  // video-service
  "/api/v1/comments":      "http://localhost:3003",  // comment-service
  "/api/v1/likes":         "http://localhost:3004",  // engagement-service
  "/api/v1/subscriptions": "http://localhost:3004",
  "/api/v1/playlists":     "http://localhost:3005",  // playlist-service
  "/api/v1/tweets":        "http://localhost:3006",  // tweet-service
  "/api/v1/live":          "http://localhost:3009",  // livestream-service
  "/api/v1/healthcheck":   "http://localhost:3001"
};

// Routes that do NOT require a JWT
export const PUBLIC_ROUTES = [
  "/api/v1/auth/register",
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  "/api/v1/videos",        // public video browsing
  "/api/v1/healthcheck"
];
```

### Step 2.3 — Gateway App
`api-gateway/src/index.js`:
```javascript
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import cors from "cors";
import { ROUTES, PUBLIC_ROUTES } from "./routes.config.js";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

// Rate limiting: 100 req/min per IP
const limiter = rateLimit({ windowMs: 60_000, max: 100 });
app.use(limiter);

// JWT Authentication middleware
app.use((req, res, next) => {
  const isPublic = PUBLIC_ROUTES.some(route => req.path.startsWith(route));
  if (isPublic && req.method === "GET") return next();

  const token = req.cookies?.accessToken ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    // Downstream services read user identity from these headers
    req.headers["x-user-id"]   = decoded._id;
    req.headers["x-user-role"] = decoded.role || "user";
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
});

// Mount proxy routes
for (const [prefix, target] of Object.entries(ROUTES)) {
  app.use(prefix, createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        res.status(503).json({ message: "Service temporarily unavailable" });
      }
    }
  }));
}

app.listen(8080, () => console.log("API Gateway running on port 8080"));
```

### Step 2.4 — Test the Gateway

```bash
# Start gateway
cd api-gateway && node src/index.js

# Test: should proxy to user-service (even if user-service not running yet)
curl http://localhost:8080/api/v1/healthcheck
# Expected: 503 (service unavailable) — gateway works, service not up yet ✅
```

**✅ Phase 2 Complete:** Single entry point routing all traffic.

---

## PHASE 3 — Split Into Microservices (Strangler Fig)
**Goal:** Each controller group becomes its own Node.js process with its own MongoDB. Time: ~1 week.

### Step 3.1 — User Service (first service to extract)

```bash
cd services/user-service
pnpm init
pnpm add express mongoose bcrypt jsonwebtoken cloudinary multer cookie-parser dotenv cors @vidtube/shared-utils
```

Copy these files from your existing `backend/`:
- `src/controllers/user.controllers.js`
- `src/models/user.models.js`
- `src/routes/user.routes.js`
- `src/middlewares/auth.middlewares.js`
- `src/middlewares/multer.middlewares.js`
- `src/utils/cloudinary.js`
- `src/db/index.js`

Update imports to use `@vidtube/shared-utils`:
```javascript
// Replace in all copied files:
import { ApiError } from "../utils/ApiError.js";
// → becomes:
import { ApiError } from "@vidtube/shared-utils/ApiError";
```

Create `services/user-service/src/index.js`:
```javascript
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cookieParser from "cookie-parser";
import { connectDB } from "./db/index.js";
import userRouter from "./routes/user.routes.js";
import { errorHandler } from "./middlewares/error.middlewares.js";

const app = express();
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

// NOTE: No CORS here — handled at API Gateway
app.use("/api/v1/users", userRouter);
app.use("/api/v1/auth", userRouter);  // auth routes
app.use(errorHandler);

connectDB().then(() => {
  app.listen(3001, () =>
    console.log("User Service running on port 3001"));
});
```

User Service `.env`:
```
PORT=3001
SERVICE_NAME=user-service
MONGODB_URI=mongodb://localhost:27017/vidtube-users
ACCESS_TOKEN_SECRET=your_secret
REFRESH_TOKEN_SECRET=your_secret
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Step 3.2 — Repeat for Each Service

Follow the exact same pattern for each service below. The only differences are the port, the MongoDB URI, and which controllers/models/routes you copy:

| Service            | Port | MongoDB URI               | Copy These Controllers      |
|--------------------|------|---------------------------|-----------------------------|
| user-service       | 3001 | .../vidtube-users         | user.controllers.js         |
| video-service      | 3002 | .../vidtube-videos        | video.controllers.js        |
| comment-service    | 3003 | .../vidtube-comments      | comment.controllers.js      |
| engagement-service | 3004 | .../vidtube-engagement    | like + subscription         |
| playlist-service   | 3005 | .../vidtube-playlists     | playlist.controllers.js     |
| tweet-service      | 3006 | .../vidtube-tweets        | tweet.controllers.js        |

### Step 3.3 — Update API Gateway Routes
Uncomment each service in `routes.config.js` as you bring it up.

### Step 3.4 — Verify All Services
```bash
# From repo root — starts all services concurrently
pnpm dev

# Test each one via the gateway
curl http://localhost:8080/api/v1/healthcheck
curl http://localhost:8080/api/v1/videos
```

**✅ Phase 3 Complete:** 6 independent services, each with its own database.

---

## PHASE 4 — Kafka Event Bus
**Goal:** Services communicate asynchronously. No more direct cross-service DB queries. Time: ~2 days.

### Step 4.1 — Install KafkaJS in Each Service
```bash
# In each service that produces or consumes events
pnpm add kafkajs
```

### Step 4.2 — Shared Kafka Client Utility
`packages/shared-utils/src/kafka.js`:
```javascript
import { Kafka } from "kafkajs";

export const createKafkaClient = (clientId) => new Kafka({
  clientId,
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  retry: { initialRetryTime: 100, retries: 8 }
});

export const createProducer = async (clientId) => {
  const kafka = createKafkaClient(clientId);
  const producer = kafka.producer();
  await producer.connect();
  return producer;
};

export const createConsumer = async (clientId, groupId) => {
  const kafka = createKafkaClient(clientId);
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  return consumer;
};
```

### Step 4.3 — Video Service: Emit Events
In `video-service/src/controllers/video.controllers.js`, after creating a video:

```javascript
import { createProducer } from "@vidtube/shared-utils/kafka";
import { VideoEvents } from "@vidtube/event-schemas";

const producer = await createProducer("video-service");

// In publishAVideo, after Video.create():
await producer.send({
  topic: "video.events",
  messages: [{
    key: video._id.toString(),
    value: JSON.stringify({
      type: VideoEvents.PUBLISHED,
      videoId: video._id,
      ownerId: video.owner,
      title: video.title,
      timestamp: Date.now()
    })
  }]
});

// In deleteVideo, after Video.findByIdAndDelete():
await producer.send({
  topic: "video.events",
  messages: [{
    key: videoId,
    value: JSON.stringify({
      type: VideoEvents.DELETED,
      videoId,
      timestamp: Date.now()
    })
  }]
});
```

### Step 4.4 — Comment Service: Consume video.deleted
`comment-service/src/consumers/videoEvents.consumer.js`:
```javascript
import { createConsumer } from "@vidtube/shared-utils/kafka";
import { Comment } from "../models/comment.models.js";
import { logger } from "@vidtube/shared-utils/logger";

export const startVideoEventsConsumer = async () => {
  const consumer = await createConsumer("comment-service", "comment-service-group");
  await consumer.subscribe({ topic: "video.events", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      if (event.type === "video.deleted") {
        const deleted = await Comment.deleteMany({ video: event.videoId });
        logger.info(`Cascade deleted ${deleted.deletedCount} comments`, {
          videoId: event.videoId
        });
      }
    }
  });
};
```

Call `startVideoEventsConsumer()` in comment-service's `index.js` on startup.

### Step 4.5 — Test Kafka Events
```bash
# Open Kafka UI at http://localhost:8090
# Publish a video via API
curl -X POST http://localhost:8080/api/v1/videos   -H "Authorization: Bearer YOUR_JWT"   -F "title=Test" -F "description=Test"   -F "videoFile=@/path/to/video.mp4"   -F "thumbnail=@/path/to/thumb.jpg"

# Check Kafka UI — you should see a message on video.events topic
```

**✅ Phase 4 Complete:** Services are loosely coupled via events.

---

## PHASE 5 — Large Video Upload Pipeline
**Goal:** Replace blocking Cloudinary upload with async S3 + FFmpeg transcoding. Time: ~1 week.

### Step 5.1 — AWS Setup
1. Create AWS account → go to S3
2. Create two buckets: `vidtube-raw-videos` and `vidtube-hls-videos`
3. Set `vidtube-hls-videos` to public read
4. Create IAM user with S3 read/write permissions → save Access Key + Secret
5. Create CloudFront distribution pointing to `vidtube-hls-videos` bucket

### Step 5.2 — Update Video Schema
In `video-service/src/models/video.models.js`, add these fields to the existing schema:

```javascript
// ADD these fields to your existing videoSchema
status: {
  type: String,
  enum: ["uploading", "transcoding", "ready", "failed"],
  default: "uploading"
},
s3RawKey:    { type: String },   // location in raw bucket
hlsBaseUrl:  { type: String },   // CloudFront base URL
resolutions: [{
  label:    String,    // "1080p", "720p", etc.
  bandwidth: Number,
  url:      String     // CloudFront URL for this rendition
}],
processingProgress: { type: Number, default: 0 }
// Keep ALL existing fields — videoFile, thumbnail, duration, etc.
```

### Step 5.3 — Presigned Upload Endpoint
Add to `video-service/src/controllers/video.controllers.js`:

```javascript
import { S3Client, CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { UploadPartCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  }
});

export const createUploadIntent = asyncHandler(async (req, res) => {
  const { title, description, fileSize, mimeType } = req.body;

  if (fileSize > 10 * 1024 * 1024 * 1024) {  // 10GB max
    throw new ApiError(400, "File exceeds 10GB limit");
  }

  const videoId  = new mongoose.Types.ObjectId();
  const s3Key    = `raw-videos/${videoId}/original`;
  const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB per chunk
  const totalParts = Math.ceil(fileSize / CHUNK_SIZE);

  const { UploadId } = await s3.send(new CreateMultipartUploadCommand({
    Bucket: process.env.S3_RAW_BUCKET,
    Key: s3Key,
    ContentType: mimeType
  }));

  const presignedUrls = await Promise.all(
    Array.from({ length: totalParts }, (_, i) =>
      getSignedUrl(s3, new UploadPartCommand({
        Bucket:     process.env.S3_RAW_BUCKET,
        Key:        s3Key,
        UploadId,
        PartNumber: i + 1
      }), { expiresIn: 3600 })
    )
  );

  await Video.create({
    _id: videoId, title, description,
    owner: req.user._id,
    status: "uploading",
    s3RawKey: s3Key,
    // Temporary placeholders — filled after transcoding
    videoFile: "", videoFilePublicId: "",
    thumbnail: "", thumbnailPublicId: "",
    duration: 0, isPublished: false
  });

  return res.status(202).json(new ApiResponse(202, {
    videoId, presignedUrls, uploadId: UploadId, s3Key
  }, "Upload intent created"));
});
```

Add route: `POST /api/v1/videos/upload-intent`

### Step 5.4 — Create Transcoding Service

```bash
cd services/transcoding-service
pnpm init
pnpm add kafkajs fluent-ffmpeg @aws-sdk/client-s3 bullmq ioredis @vidtube/shared-utils @vidtube/event-schemas
```

`services/transcoding-service/src/workers/transcodeWorker.js`:
```javascript
import ffmpeg from "fluent-ffmpeg";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs/promises";
import path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

const RENDITIONS = [
  { label: "1080p", size: "1920x1080", vb: "5000k", ab: "192k" },
  { label: "720p",  size: "1280x720",  vb: "2800k", ab: "128k" },
  { label: "480p",  size: "854x480",   vb: "1400k", ab: "128k" },
  { label: "360p",  size: "640x360",   vb: "800k",  ab: "96k"  },
  { label: "144p",  size: "256x144",   vb: "300k",  ab: "64k"  },
];

export async function transcodeVideo(job) {
  const { videoId, s3Key } = job.data;
  const workDir = `/tmp/transcode/${videoId}`;
  await fs.mkdir(workDir, { recursive: true });

  // 1. Download raw video from S3
  const rawPath = path.join(workDir, "raw.mp4");
  await downloadFromS3(s3Key, rawPath);
  await job.updateProgress(10);

  // 2. Extract thumbnail at 5s
  const thumbPath = await extractThumbnail(rawPath, workDir);
  const thumbUrl  = await uploadToS3(thumbPath,
    `thumbnails/${videoId}.jpg`, "image/jpeg");
  await job.updateProgress(15);

  // 3. Transcode each rendition
  const renditionResults = [];
  for (let i = 0; i < RENDITIONS.length; i++) {
    const r = RENDITIONS[i];
    const outDir = path.join(workDir, r.label);
    await fs.mkdir(outDir, { recursive: true });

    await runFFmpeg(rawPath, outDir, r);
    const baseUrl = await uploadHlsDir(outDir, videoId, r.label);
    renditionResults.push({ label: r.label, url: `${baseUrl}/index.m3u8` });
    await job.updateProgress(15 + ((i + 1) / RENDITIONS.length) * 70);
  }

  // 4. Generate and upload master playlist
  const masterContent = generateMasterM3U8(renditionResults);
  const masterUrl = await uploadMasterPlaylist(masterContent, videoId);
  await job.updateProgress(95);

  // 5. Emit video.transcoded Kafka event
  await kafkaProducer.send({
    topic: "video.events",
    messages: [{
      key: videoId,
      value: JSON.stringify({
        type: "video.transcoded",
        videoId, masterUrl, thumbUrl,
        resolutions: renditionResults,
        duration: await getVideoDuration(rawPath)
      })
    }]
  });

  // 6. Cleanup temp files
  await fs.rm(workDir, { recursive: true, force: true });
  await job.updateProgress(100);
}

function runFFmpeg(input, outputDir, rendition) {
  return new Promise((resolve, reject) =>
    ffmpeg(input)
      .videoCodec("libx264").audioCodec("aac")
      .size(rendition.size)
      .videoBitrate(rendition.vb).audioBitrate(rendition.ab)
      .outputOptions([
        "-hls_time", "6",
        "-hls_list_size", "0",
        "-hls_segment_filename", `${outputDir}/seg%03d.ts`
      ])
      .output(`${outputDir}/index.m3u8`)
      .on("end", resolve).on("error", reject)
      .run()
  );
}
```

### Step 5.5 — Video Service: Consume video.transcoded
In `video-service`, add a Kafka consumer:

```javascript
// After transcoding completes, update the video document
if (event.type === "video.transcoded") {
  await Video.findByIdAndUpdate(event.videoId, {
    status: "ready",
    hlsBaseUrl: event.masterUrl,
    thumbnail: event.thumbUrl,
    duration: event.duration,
    resolutions: event.resolutions,
    isPublished: true
  });
}
if (event.type === "video.transcoding_failed") {
  await Video.findByIdAndUpdate(event.videoId, { status: "failed" });
}
```

### Step 5.6 — Test the Full Upload Flow

```bash
# 1. Get presigned URLs
curl -X POST http://localhost:8080/api/v1/videos/upload-intent   -H "Authorization: Bearer $JWT"   -H "Content-Type: application/json"   -d '{"title":"My Video","description":"Test","fileSize":50000000,"mimeType":"video/mp4"}'

# 2. Upload file directly to S3 using the presigned URL
curl -X PUT "PRESIGNED_URL_FROM_RESPONSE"   --upload-file /path/to/video.mp4

# 3. Watch Kafka UI for video.uploaded → video.transcoded events
# 4. Poll GET /api/v1/videos/:id — status should go uploading → transcoding → ready
```

**✅ Phase 5 Complete:** Large videos upload without blocking your server.

---

## PHASE 6 — Live Streaming
**Goal:** Creators stream via OBS, viewers watch in-browser. Time: ~1 week.

### Step 6.1 — Create Livestream Service

```bash
cd services/livestream-service
pnpm init
pnpm add node-media-server socket.io ioredis kafkajs mongoose bcrypt express @vidtube/shared-utils
```

### Step 6.2 — LiveStream Schema
`services/livestream-service/src/models/livestream.models.js`:
```javascript
import mongoose, { Schema } from "mongoose";

const liveStreamSchema = new Schema({
  owner:           { type: Schema.Types.ObjectId, ref: "User", required: true },
  title:           { type: String, required: true },
  streamKey:       { type: String, required: true }, // bcrypt hashed
  status:          { type: String, enum: ["offline","scheduled","live","ended"], default: "offline" },
  hlsUrl:          { type: String },
  thumbnailUrl:    { type: String },
  viewerCount:     { type: Number, default: 0 },
  peakViewers:     { type: Number, default: 0 },
  startedAt:       { type: Date },
  endedAt:         { type: Date },
  archivedVideoId: { type: Schema.Types.ObjectId },  // VOD after stream
  isRecorded:      { type: Boolean, default: true },
  scheduledAt:     { type: Date }
}, { timestamps: true });

export const LiveStream = mongoose.model("LiveStream", liveStreamSchema);
```

### Step 6.3 — Stream Key Controller
```javascript
import crypto from "crypto";
import bcrypt from "bcrypt";

export const generateStreamKey = asyncHandler(async (req, res) => {
  const { title, scheduledAt } = req.body;

  // Generate and hash the stream key
  const rawKey    = crypto.randomBytes(24).toString("hex");
  const hashedKey = await bcrypt.hash(rawKey, 10);

  await LiveStream.create({
    owner: req.user._id,
    title,
    streamKey: hashedKey,
    status: "offline",
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined
  });

  return res.status(201).json(new ApiResponse(201, {
    streamKey: rawKey,   // Raw key shown ONCE — user must save it in OBS
    rtmpUrl:   `rtmp://${process.env.INGEST_HOST}/live`,
    streamUrl: `https://${process.env.CDN_DOMAIN}/live/${req.user._id}/master.m3u8`
  }, "Stream key generated — copy it now, it won't be shown again"));
});
```

### Step 6.4 — RTMP Ingest Server
`services/livestream-service/src/rtmp/server.js`:
```javascript
import NodeMediaServer from "node-media-server";
import bcrypt from "bcrypt";
import { LiveStream } from "../models/livestream.models.js";
import { startLiveTranscoding, stopLiveTranscoding } from "./transcoder.js";
import { kafkaProducer } from "../kafka/producer.js";
import { LiveStreamEvents } from "@vidtube/event-schemas";

const nms = new NodeMediaServer({
  rtmp: { port: 1935, chunk_size: 60000, allow_origin: "*" },
  http: { port: 8888, mediaroot: "./media" }
});

// Called when OBS connects and starts publishing
nms.on("prePublish", async (id, StreamPath, args) => {
  // StreamPath format: /live/{channelId}/{streamKey}
  const parts = StreamPath.split("/");
  const channelId = parts[2];
  const streamKey = parts[3];

  const stream = await LiveStream.findOne({
    owner: channelId,
    status: { $in: ["offline", "scheduled"] }
  });

  if (!stream || !(await bcrypt.compare(streamKey, stream.streamKey))) {
    nms.getSession(id).reject();
    return;
  }

  await LiveStream.findByIdAndUpdate(stream._id, {
    status: "live",
    startedAt: new Date()
  });

  // Emit event so Notification Service can alert subscribers
  await kafkaProducer.send({
    topic: "livestream.events",
    messages: [{
      key: channelId,
      value: JSON.stringify({
        type: LiveStreamEvents.STARTED,
        channelId, streamId: stream._id.toString(),
        title: stream.title, timestamp: Date.now()
      })
    }]
  });

  // Start FFmpeg transcoding pipeline
  startLiveTranscoding(channelId, stream._id.toString());
});

// Called when OBS disconnects
nms.on("donePublish", async (id, StreamPath) => {
  const channelId = StreamPath.split("/")[2];
  const stream = await LiveStream.findOneAndUpdate(
    { owner: channelId, status: "live" },
    { status: "ended", endedAt: new Date() },
    { new: true }
  );

  stopLiveTranscoding(channelId);

  await kafkaProducer.send({
    topic: "livestream.events",
    messages: [{
      key: channelId,
      value: JSON.stringify({
        type: LiveStreamEvents.ENDED,
        channelId, streamId: stream?._id.toString(),
        timestamp: Date.now()
      })
    }]
  });
});

nms.run();
```

### Step 6.5 — Live Chat (Socket.IO + Redis)
`services/livestream-service/src/sockets/chat.js`:
```javascript
import { createClient } from "redis";

const redisPub = createClient({ url: process.env.REDIS_URL });
const redisSub = redisPub.duplicate();

await redisPub.connect();
await redisSub.connect();

export const initChat = (io) => {
  io.on("connection", async (socket) => {
    socket.on("join:stream", async ({ streamId }) => {
      socket.join(`stream:${streamId}`);
      await redisPub.incr(`viewers:${streamId}`);
      const count = await redisPub.get(`viewers:${streamId}`);
      io.to(`stream:${streamId}`).emit("viewerCount", parseInt(count));

      // Send last 50 messages
      const history = await redisPub.lRange(`chat:${streamId}`, -50, -1);
      socket.emit("chatHistory", history.map(JSON.parse));
    });

    socket.on("chat:message", async ({ streamId, message }) => {
      // Basic sanitization — strip HTML tags
      const clean = message.replace(/<[^>]*>/g, "").trim().slice(0, 200);
      const msg = {
        id:        crypto.randomUUID(),
        userId:    socket.data.userId,
        username:  socket.data.username,
        message:   clean,
        timestamp: Date.now()
      };
      await redisPub.publish(`chat:${streamId}`, JSON.stringify(msg));
      await redisPub.rPush(`chat:${streamId}`, JSON.stringify(msg));
      await redisPub.lTrim(`chat:${streamId}`, -500, -1); // keep last 500 only
    });

    socket.on("leave:stream", async ({ streamId }) => {
      socket.leave(`stream:${streamId}`);
      await redisPub.decr(`viewers:${streamId}`);
    });
  });

  // Redis subscriber relays messages to all Socket.IO clients in the room
  redisSub.pSubscribe("chat:*", (message, channel) => {
    const streamId = channel.replace("chat:", "");
    io.to(`stream:${streamId}`).emit("chat:message", JSON.parse(message));
  });
};
```

### Step 6.6 — Test Live Streaming

```bash
# 1. Generate stream key
curl -X POST http://localhost:8080/api/v1/live/stream-key   -H "Authorization: Bearer $JWT"   -d '{"title":"My First Stream"}'

# 2. Open OBS:
#    Settings → Stream → Service: Custom
#    Server: rtmp://localhost/live
#    Stream Key: {key from response}
#    Click "Start Streaming"

# 3. Open browser → play the stream
#    https://hls-js.netlify.app/demo/
#    Paste: http://localhost:8888/live/{channelId}/master.m3u8
```

**✅ Phase 6 Complete:** Full live streaming pipeline working end-to-end.

---

## PHASE 7 — Shorts, Search & Watch History
**Goal:** Key engagement features that use existing infrastructure. Time: ~4 days.

### Step 7.1 — Shorts (Vertical Video Detection)
Add `isShort: Boolean` to video schema. In Transcoding Service, after FFmpeg probe:

```javascript
import ffmpeg from "fluent-ffmpeg";

const getVideoDimensions = (filePath) => new Promise((resolve, reject) =>
  ffmpeg.ffprobe(filePath, (err, data) => {
    if (err) return reject(err);
    const stream = data.streams.find(s => s.codec_type === "video");
    resolve({ width: stream.width, height: stream.height });
  })
);

// In transcodeVideo worker, after downloading raw file:
const { width, height } = await getVideoDimensions(rawPath);
const isShort = height > width && duration <= 60; // vertical AND ≤ 60 seconds

// Include isShort in video.transcoded event
await kafkaProducer.send({ ...event, isShort });
```

Add Shorts feed endpoint in Video Service:
```javascript
// GET /api/v1/videos/shorts
const getShorts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const shorts = await Video.aggregatePaginate(
    Video.aggregate([
      { $match: { isShort: true, isPublished: true } },
      { $sort: { views: -1, createdAt: -1 } }  // trending shorts first
    ]),
    { page: parseInt(page), limit: parseInt(limit) }
  );
  return res.status(200).json(new ApiResponse(200, shorts, "Shorts fetched"));
});
```

### Step 7.2 — Watch History with Resume Playback
Update User model:
```javascript
// Replace: watchHistory: [{ type: Schema.Types.ObjectId, ref: "Video" }]
// With:
watchHistory: [{
  video:     { type: Schema.Types.ObjectId, ref: "Video" },
  progress:  { type: Number, default: 0 },  // seconds watched
  watchedAt: { type: Date, default: Date.now }
}]
```

In `getVideoById` controller (already exists), replace the `$addToSet` call:
```javascript
// Replace the existing addToSet call with:
await User.findByIdAndUpdate(req.user._id, {
  $pull:  { watchHistory: { video: videoId } }, // remove old entry first
  $push:  { watchHistory: { $each: [{ video: videoId, watchedAt: new Date() }], $position: 0 } }
});

// New endpoint: PATCH /api/v1/users/watch-progress
export const updateWatchProgress = asyncHandler(async (req, res) => {
  const { videoId, progress } = req.body; // progress in seconds
  await User.findOneAndUpdate(
    { _id: req.user._id, "watchHistory.video": videoId },
    { $set: { "watchHistory.$.progress": progress } }
  );
  return res.status(200).json(new ApiResponse(200, {}, "Progress saved"));
});
```

### Step 7.3 — Replace Regex Search with Elasticsearch

```bash
# Start Elasticsearch locally
docker run -d --name elasticsearch   -p 9200:9200   -e "discovery.type=single-node"   -e "xpack.security.enabled=false"   elasticsearch:8.13.0

# Install in video-service
pnpm add @elastic/elasticsearch
```

`video-service/src/utils/elasticsearch.js`:
```javascript
import { Client } from "@elastic/elasticsearch";

export const esClient = new Client({ node: process.env.ELASTICSEARCH_URL });

export const indexVideo = async (video) => {
  await esClient.index({
    index: "videos",
    id: video._id.toString(),
    document: {
      title:       video.title,
      description: video.description,
      tags:        video.tags || [],
      ownerId:     video.owner.toString(),
      views:       video.views,
      createdAt:   video.createdAt
    }
  });
};

export const searchVideos = async (query, { page = 1, limit = 10 }) => {
  const result = await esClient.search({
    index: "videos",
    from: (page - 1) * limit,
    size: limit,
    query: {
      multi_match: {
        query,
        fields: ["title^3", "description", "tags^2"],  // title weighted 3x
        fuzziness: "AUTO"   // handles typos: "javascrpit" → "javascript"
      }
    }
  });
  return result.hits.hits.map(hit => ({ ...hit._source, _id: hit._id, score: hit._score }));
};
```

Replace the `$regex` block in `getAllVideos` with:
```javascript
// In getAllVideos, replace the $or $regex match with:
if (query) {
  const esResults = await searchVideos(query, { page, limit });
  const videoIds  = esResults.map(r => new mongoose.Types.ObjectId(r._id));
  pipeline.push({ $match: { _id: { $in: videoIds } } });
}
```

Index videos on publish (in video.transcoded consumer):
```javascript
await indexVideo(updatedVideo);
```

**✅ Phase 7 Complete:** Shorts feed, resume playback, and typo-tolerant search.

---

## PHASE 8 — Dockerize & Deploy
**Goal:** Every service runs in a container, deployable to any cloud. Time: ~3 days.

### Step 8.1 — Dockerfile (same template for all services)
`services/user-service/Dockerfile`:
```dockerfile
FROM node:22-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile

FROM base AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages     ./packages
COPY src/ ./src/
COPY package.json ./

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "src/index.js"]
```

### Step 8.2 — Production docker-compose
`infrastructure/docker/docker-compose.prod.yml`:
```yaml
version: "3.9"
services:
  api-gateway:
    build: ../../api-gateway
    ports: ["80:8080"]
    env_file: .env.gateway
    depends_on: [user-service, video-service]

  user-service:
    build: ../../services/user-service
    env_file: .env.users
    depends_on: [mongo-users]

  video-service:
    build: ../../services/video-service
    env_file: .env.videos
    depends_on: [mongo-videos, kafka]

  transcoding-service:
    build: ../../services/transcoding-service
    env_file: .env.transcoding
    depends_on: [kafka, redis]

  livestream-service:
    build: ../../services/livestream-service
    ports: ["1935:1935"]  # RTMP port must be exposed
    env_file: .env.livestream
    depends_on: [mongo-livestreams, redis, kafka]

  # ... repeat for all services
```

### Step 8.3 — GitHub Actions CI/CD
`.github/workflows/deploy.yml`:
```yaml
name: Deploy Services
on:
  push:
    branches: [main]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      user-service:      ${{ steps.filter.outputs.user-service }}
      video-service:     ${{ steps.filter.outputs.video-service }}
      transcoding:       ${{ steps.filter.outputs.transcoding }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            user-service:  ["services/user-service/**"]
            video-service: ["services/video-service/**"]
            transcoding:   ["services/transcoding-service/**"]

  deploy-user-service:
    needs: detect-changes
    if: needs.detect-changes.outputs.user-service == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and push Docker image
        run: |
          docker build -t vidtube/user-service:${{ github.sha }} services/user-service/
          docker push vidtube/user-service:${{ github.sha }}
      - name: Deploy to server
        run: |
          ssh ${{ secrets.DEPLOY_HOST }} "docker pull vidtube/user-service:${{ github.sha }} && docker compose up -d user-service"
```

This means only the **changed service** gets rebuilt and redeployed — not everything.

### Step 8.4 — Final Health Check

```bash
# Build everything
docker compose -f infrastructure/docker/docker-compose.prod.yml build

# Start everything
docker compose -f infrastructure/docker/docker-compose.prod.yml up -d

# Verify all services healthy
curl http://localhost/api/v1/healthcheck
# Expected: { status: "ok" }

# Test the full video upload flow end-to-end
# Test live streaming via OBS
# Test search with typos
```

**✅ Phase 8 Complete:** Full production-ready deployment pipeline.**

---

## SUMMARY — What You'll Have Built

| Phase | What You Built |
|-------|----------------|
| 0 | Monorepo, Docker infrastructure, all databases locally |
| 1 | shared-utils + event-schemas packages |
| 2 | API Gateway with JWT auth + rate limiting |
| 3 | 6 microservices split from monolith |
| 4 | Kafka event bus — async service communication |
| 5 | S3 presigned uploads + FFmpeg transcoding pipeline |
| 6 | RTMP live streaming + live chat via Socket.IO |
| 7 | Shorts, resume playback, Elasticsearch search |
| 8 | Docker containers + GitHub Actions CI/CD |

**Total estimated time: 6–8 weeks** building solo at a focused pace.

---

## QUICK REFERENCE — Port Map

| Service              | Port  | Protocol |
|----------------------|-------|----------|
| API Gateway          | 8080  | HTTP     |
| User Service         | 3001  | HTTP     |
| Video Service        | 3002  | HTTP     |
| Comment Service      | 3003  | HTTP     |
| Engagement Service   | 3004  | HTTP     |
| Playlist Service     | 3005  | HTTP     |
| Tweet Service        | 3006  | HTTP     |
| Transcoding Service  | 3008  | Internal |
| Livestream Service   | 3009  | HTTP     |
| RTMP Ingest          | 1935  | TCP/RTMP |
| Kafka                | 9092  | TCP      |
| Redis                | 6379  | TCP      |
| Elasticsearch        | 9200  | HTTP     |
| Kafka UI             | 8090  | HTTP     |
