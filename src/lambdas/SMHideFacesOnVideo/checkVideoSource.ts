import { generalFileService } from "../../services";
import { VideoData } from "../../domain/interfaces/types";
import * as ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";

const bucketName = process.env.MAIN_BUCKET_NAME;
const MAX_DURATION = 30;
const MAX_FPS = 30;
const MAX_DIMENSION = 1920; //HD 1920x1080

type Event = {
  Input: {
    id: string;
    filename: string;
    s3key: string;
  };
};

const makeCleanTemporalFolder = async (tmpPath: string): Promise<void> => {
  if (fs.existsSync(tmpPath)) {
    fs.rmdirSync(tmpPath, { recursive: true });
  }
  await fs.promises.mkdir(tmpPath);
};

const getDurationTag = (video: any) => {
  if (video.tags && video.tags.DURATION) {
    const data = video.tags.DURATION.split(":");
    return data[2] ? parseFloat(data[2]) : MAX_DURATION;
  }
  return MAX_DURATION;
};

const getVideoMetadata = async (
  id: string,
  filename: string,
  s3key: string
): Promise<VideoData> => {
  const resultVideo = await generalFileService.getS3Stream(bucketName, s3key);

  if (resultVideo.isFailure) {
    throw Error(`getVideoMetadata: ${resultVideo.error}`);
  }

  const getMetadata = async () => {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(resultVideo.value, function (error: any, metadata: any) {
        if (error) {
          reject(`getVideoMetadata: ${error}`);
        }
        resolve(metadata);
      });
    });
  };

  const metadata: any = await getMetadata();
  const video = metadata.streams[0];
  const audio = metadata.streams[1];
  const fpsRate = video.r_frame_rate.split("/");
  const duration =
    !video.duration || "N/A" === video.duration
      ? getDurationTag(video)
      : video.duration;
  const fps = Math.ceil(parseInt(fpsRate[0]) / parseInt(fpsRate[1]));
  const totalFrames =
    !video.nb_frames || "N/A" === video.nb_frames
      ? Math.ceil(duration * fps)
      : video.nb_frames;

  return {
    id,
    filename,
    duration,
    width: video.width,
    height: video.height,
    totalFrames,
    fps,
    s3key,
    audio: !!audio,
  };
};

const getVideoFrameDimensions = async (
  videoData: VideoData,
  s3key: string
): Promise<{ width: number; height: number }> => {
  const folder = `/tmp/${videoData.id}`;
  const filename = `${videoData.id}-screenshot.png`;
  const screenshotPath = `${folder}/${filename}`;
  const videoPath = `${folder}/temporal-video-${videoData.filename}`;

  const resultVideo = await generalFileService.getS3Buffer(bucketName, s3key);

  if (resultVideo.isFailure) {
    throw Error(`getVideoDimensions: ${resultVideo.error}`);
  }

  await fs.promises.writeFile(videoPath, resultVideo.value);

  const getVideoFrame = async () => {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .on("end", function () {
          resolve("ok");
        })
        .on("error", function (err: any) {
          reject(err);
        })
        .screenshots({
          count: 1,
          timestamps: [1],
          filename,
          folder,
        });
    });
  };

  await getVideoFrame();

  /* eslint-disable @typescript-eslint/no-var-requires */
  const imageSize = require("image-size");
  const dimensions = imageSize(screenshotPath);

  await fs.promises.unlink(screenshotPath);
  await fs.promises.unlink(videoPath);

  return dimensions;
};

const changeVideoSource = async (
  videoData: VideoData,
  s3key: string,
  percentage = 100
): Promise<string> => {
  const originalVideoPath = `/tmp/${videoData.id}/original-${videoData.filename}`;
  const newVideoPath = `/tmp/${videoData.id}/${videoData.filename}`;
  const resultVideo = await generalFileService.getS3Buffer(bucketName, s3key);

  if (resultVideo.isFailure) {
    throw Error(`explodeVideo: ${resultVideo.error}`);
  }

  await fs.promises.writeFile(originalVideoPath, resultVideo.value);

  const changeVideo = async () => {
    return new Promise((resolve, reject) => {
      ffmpeg(originalVideoPath)
        .on("end", function () {
          resolve("ok");
        })
        .on("error", function (err: any) {
          reject(err);
        })
        .size(`${percentage}%`)
        .outputFPS(videoData.fps)
        .outputOptions("-movflags frag_keyframe+empty_moov")
        .save(newVideoPath);
    });
  };

  await changeVideo();

  //save video
  const videoBuffer = await fs.promises.readFile(newVideoPath);
  const videoS3Key = `videos/temporal/${videoData.id}/${videoData.filename}`;
  await generalFileService.saveBuffer(bucketName, videoS3Key, videoBuffer);

  return videoS3Key;
};

export const handler = async (event: Event): Promise<VideoData> => {
  const { id, filename, s3key } = event.Input;
  const videoData = await getVideoMetadata(id, filename, s3key);
  const { width, height } = videoData;
  const tmpPath = `/tmp/${videoData.id}`;

  if (videoData.duration > MAX_DURATION + 1) {
    throw Error("max duration error");
  }

  await makeCleanTemporalFolder(tmpPath);

  if (!width || !height) {
    const dimensions = await getVideoFrameDimensions(videoData, s3key);

    videoData.width = dimensions.width;
    videoData.height = dimensions.height;
  }

  if (!videoData.fps || videoData.fps > MAX_FPS) {
    videoData.fps = MAX_FPS;
    videoData.totalFrames = Math.ceil(videoData.duration * MAX_FPS);
  }

  const maxDimension =
    Math.max(videoData.width, videoData.height) || MAX_DIMENSION;
  const haveWrongSizes =
    videoData.width > MAX_DIMENSION || videoData.height > MAX_DIMENSION;
  const sizePercentage = haveWrongSizes
    ? Math.round((MAX_DIMENSION * 100) / maxDimension)
    : 100;

  const videoS3Key = await changeVideoSource(videoData, s3key, sizePercentage);

  videoData.s3key = videoS3Key;
  videoData.width = videoData.width * (sizePercentage / 100);
  videoData.height = videoData.height * (sizePercentage / 100);

  return videoData;
};
