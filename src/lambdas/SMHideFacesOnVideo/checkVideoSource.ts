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
    s3key: string;
  };
};

type Response = {
  s3key: string;
  videoData: VideoData;
};

const makeCleanTemporalFolder = async (tmpPath: string): Promise<void> => {
  if (fs.existsSync(tmpPath)) {
    fs.rmdirSync(tmpPath, { recursive: true });
  }
  await fs.promises.mkdir(tmpPath);
};

const changeVideoSource = async (
  videoData: VideoData,
  s3key: string,
  fps = 30,
  percentage = 100
): Promise<string> => {
  const tmpPath = `/tmp/${videoData.id}`;
  const newVideoPath = `${tmpPath}/${videoData.filename}`;

  await makeCleanTemporalFolder(tmpPath);

  const resultVideo = await generalFileService.getS3Stream(bucketName, s3key);

  if (resultVideo.isFailure) {
    throw Error(`explodeVideo: ${resultVideo.error}`);
  }

  const changeVideo = async () => {
    return new Promise((resolve, reject) => {
      ffmpeg(resultVideo.value)
        .on("end", function () {
          resolve("ok");
        })
        .on("error", function (err: any) {
          reject(err);
        })
        .size(`${percentage}%`)
        .outputFPS(fps)
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

export const handler = async (event: Event): Promise<Response> => {
  const { s3key } = event.Input;
  const [, , id, filename] = s3key.split("/");

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
  const { width, height } = video;
  const fpsRate = video.r_frame_rate.split("/");
  const videoData = {
    id,
    filename,
    duration: video.duration,
    width,
    height,
    totalFrames: video.nb_frames,
    fps: Math.ceil(parseInt(fpsRate[0]) / parseInt(fpsRate[1])),
  };

  if (video.duration > MAX_DURATION + 1) {
    throw Error("max duration error");
  }

  const haveWrongFPS = videoData.fps > MAX_FPS;

  //TODOOOOOOOO get real dimensions with a frame like on explodeVideo
  const haveWrongSizes =
    !width || !height || width > MAX_DIMENSION || height > MAX_DIMENSION;

  if (!videoData.fps || haveWrongFPS) {
    videoData.fps = MAX_FPS;
    videoData.totalFrames = Math.ceil(videoData.duration * MAX_FPS);
  }

  let newS3key = s3key;

  if (haveWrongFPS || haveWrongSizes) {
    const fps = Math.min(videoData.fps, MAX_FPS);
    const maxDimension = Math.max(width, height) || MAX_DIMENSION;
    const sizePercentage = haveWrongSizes
      ? Math.round((MAX_DIMENSION * 100) / maxDimension)
      : 100;
    const videoS3Key = await changeVideoSource(
      videoData,
      s3key,
      fps,
      sizePercentage
    );
    newS3key = videoS3Key;
    //check real dimensions on next step: explodeVideo
    videoData.width = null;
    videoData.height = null;
  }

  return {
    s3key: newS3key,
    videoData,
  };
};
