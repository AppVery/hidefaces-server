import { Request, Response } from "./requestResponseDTO";
import { VideoData } from "../../domain/interfaces/types";
import { VideoService } from "../../domain/interfaces/videoService";
import { FileService } from "../../domain/interfaces/fileService";
import { Result } from "../../domain/Result";
import { UseCase } from "../../domain/useCase";
import { parseExtension } from "../../utils/validations";
import getFilePaths, {
  makeCleanTemporalFolder,
} from "../../utils/getFilePaths";
import * as fs from "fs";

const MAX_DURATION = 30;
const MAX_FPS = 30;
const MAX_DIMENSION = 1920; //HD 1920x1080

type Dimensions = { width: number; height: number };

export class CheckVideoSource implements UseCase<Request, Response> {
  private bucketName = process.env.MAIN_BUCKET_NAME;
  private fileService: FileService;
  private videoService: VideoService;

  constructor(fileService: FileService, videoService: VideoService) {
    this.fileService = fileService;
    this.videoService = videoService;
  }

  public async execute(request: Request): Promise<Result<Response>> {
    const { id, extension } = request;

    const filename = `${id}.${extension}`;
    const s3key = getFilePaths.s3SourceVideo(id, extension);
    const resultVideoData = await this.getVideoMetadata(id, filename, s3key);

    if (resultVideoData.isFailure) {
      return Result.combineFail<Response>(
        resultVideoData,
        `[CheckVideoSource]`
      );
    }

    const videoData = resultVideoData.value;
    const { width, height, duration } = videoData;

    if (duration > MAX_DURATION + 1) {
      return Result.fail<Response>(
        `[CheckVideoSource] duration of ${duration} seconds`
      );
    }

    await makeCleanTemporalFolder(videoData.id);

    if (!width || !height) {
      const resultDimensions = await this.getVideoFrameDimensions(
        videoData,
        s3key
      );

      if (resultDimensions.isFailure) {
        return Result.combineFail<Response>(
          resultDimensions,
          `[CheckVideoSource]`
        );
      }

      videoData.width = resultDimensions.value.width;
      videoData.height = resultDimensions.value.height;
    }

    if (!videoData.fps || videoData.fps > MAX_FPS) {
      videoData.fps = MAX_FPS;
      videoData.totalFrames = Math.ceil(videoData.duration * MAX_FPS);
    }

    const sizePercentage = this.getSizePercentage(
      videoData.width,
      videoData.height
    );
    const newS3key = getFilePaths.s3TmpVideo(videoData.id, videoData.filename);
    const resultChangeVideo = await this.changeVideoSource(
      videoData,
      s3key,
      newS3key,
      sizePercentage
    );

    if (resultChangeVideo.isFailure) {
      return Result.combineFail<Response>(
        resultChangeVideo,
        `[CheckVideoSource]`
      );
    }

    videoData.s3key = newS3key;
    videoData.width = Math.floor(videoData.width * (sizePercentage / 100));
    videoData.height = Math.floor(videoData.height * (sizePercentage / 100));

    return Result.ok<Response>(videoData);
  }

  private getSizePercentage(width: number, height: number) {
    const haveWrongSizes = width > MAX_DIMENSION || height > MAX_DIMENSION;
    const maxDimension = Math.max(width, height) || MAX_DIMENSION;

    return haveWrongSizes
      ? Math.round((MAX_DIMENSION * 100) / maxDimension)
      : 100;
  }

  private async getVideoMetadata(
    id: string,
    filename: string,
    s3key: string
  ): Promise<Result<VideoData>> {
    const resultVideo = await this.fileService.getS3Stream(
      this.bucketName,
      s3key
    );

    if (resultVideo.isFailure) {
      return Result.continueFail(resultVideo);
    }

    try {
      const metadata: any = await this.videoService.getMetadata(
        resultVideo.value
      );
      const video = metadata.streams[0];
      const audio = metadata.streams[1];
      const fpsRate = video.r_frame_rate.split("/");
      const duration =
        !video.duration || "N/A" === video.duration
          ? this.getDurationTag(video)
          : video.duration;
      const fps = Math.ceil(parseInt(fpsRate[0]) / parseInt(fpsRate[1]));
      const totalFrames =
        !video.nb_frames || "N/A" === video.nb_frames
          ? Math.ceil(duration * fps)
          : video.nb_frames;

      const videoData = {
        id,
        filename,
        extension: parseExtension("filename", filename),
        duration,
        width: video.width,
        height: video.height,
        totalFrames,
        fps,
        s3key,
        audio: !!audio,
      };

      return Result.ok<VideoData>(videoData);
    } catch (error) {
      return Result.fail<VideoData>(`getVideoMetadata: ${error.toString()}`);
    }
  }

  private getDurationTag(video: any) {
    if (video.tags && video.tags.DURATION) {
      const data = video.tags.DURATION.split(":");
      return data[2] ? parseFloat(data[2]) : MAX_DURATION;
    }
    return MAX_DURATION;
  }

  private async getVideoFrameDimensions(
    videoData: VideoData,
    s3key: string
  ): Promise<Result<Dimensions>> {
    const { id, filename } = videoData;
    const folder = getFilePaths.localFolder(id);
    const videoPath = getFilePaths.localFile(id, filename);
    const screenshotFilename = `${id}-screenshot.png`;
    const screenshotPath = getFilePaths.localFile(id, screenshotFilename);

    const resultVideo = await this.fileService.getS3Buffer(
      this.bucketName,
      s3key
    );

    if (resultVideo.isFailure) {
      return Result.continueFail<Dimensions>(resultVideo);
    }

    try {
      await fs.promises.writeFile(videoPath, resultVideo.value);

      await this.videoService.getVideoFrame(
        videoPath,
        screenshotFilename,
        folder
      );

      /* eslint-disable @typescript-eslint/no-var-requires */
      const imageSize = require("image-size");
      const dimensions = imageSize(screenshotPath);

      await fs.promises.unlink(screenshotPath);
      await fs.promises.unlink(videoPath);

      return Result.ok<Dimensions>(dimensions);
    } catch (error) {
      return Result.fail<Dimensions>(
        `getVideoFrameDimensions: ${error.toString()}`
      );
    }
  }

  private async changeVideoSource(
    videoData: VideoData,
    sourceS3key: string,
    newS3key: string,
    percentage = 100
  ): Promise<Result<void>> {
    const originalVideoPath = getFilePaths.localFile(
      videoData.id,
      `original-${videoData.filename}`
    );
    const newVideoPath = getFilePaths.localFile(
      videoData.id,
      videoData.filename
    );

    const resultVideo = await this.fileService.getS3Buffer(
      this.bucketName,
      sourceS3key
    );

    if (resultVideo.isFailure) {
      return Result.continueFail(resultVideo);
    }

    try {
      await fs.promises.writeFile(originalVideoPath, resultVideo.value);

      await this.videoService.changeVideoSource(
        originalVideoPath,
        percentage,
        videoData.fps,
        newVideoPath
      );

      //save video
      const videoBuffer = await fs.promises.readFile(newVideoPath);

      await this.fileService.saveBuffer(this.bucketName, newS3key, videoBuffer);

      return Result.ok<void>();
    } catch (error) {
      return Result.fail<void>(`changeVideoSource ${error.toString()}`);
    }
  }
}
