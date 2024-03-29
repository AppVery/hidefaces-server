import { VideoService } from "../domain/interfaces/videoService";
import { Readable } from "stream";

/* eslint-disable  @typescript-eslint/no-var-requires */
const ffmpeg = require("fluent-ffmpeg");

export class FfmpegVideoService implements VideoService {
  private ffmpeg = ffmpeg;

  public async getMetadata(videoBuffer: Buffer) {
    return new Promise((resolve, reject) => {
      this.ffmpeg.ffprobe(videoBuffer, function (error: any, metadata: any) {
        if (error) {
          reject(`getVideoMetadata: ${error}`);
        }
        resolve(metadata);
      });
    });
  }

  public async getVideoFrame(
    videoPath: string,
    screenshotFilename: string,
    folder: string
  ) {
    return new Promise((resolve, reject) => {
      this.ffmpeg(videoPath)
        .on("end", function () {
          resolve("ok");
        })
        .on("error", function (err: any) {
          reject(err);
        })
        .screenshots({
          count: 1,
          timestamps: [1],
          filename: screenshotFilename,
          folder,
        });
    });
  }

  public async changeVideoSource(
    path: string,
    percentage: number,
    fps: number,
    newPath: string
  ) {
    return new Promise((resolve, reject) => {
      this.ffmpeg(path)
        .on("end", function () {
          resolve("ok");
        })
        .on("error", function (err: any) {
          reject(err);
        })
        .size(`${percentage}%`)
        .outputFPS(fps)
        .outputOptions("-movflags frag_keyframe+empty_moov")
        .save(newPath);
    });
  }

  public async explodeVideo(
    videoBuffer: Buffer,
    framesPath: string,
    audioPath: string
  ) {
    return new Promise((resolve, reject) => {
      this.ffmpeg(videoBuffer)
        .on("end", function () {
          resolve("ok");
        })
        .on("error", function (err: any) {
          reject(err);
        })
        .output(audioPath)
        .output(framesPath)
        .run();
    });
  }

  public async explodeMuteVideo(videoBuffer: Buffer, framesPath: string) {
    return new Promise((resolve, reject) => {
      this.ffmpeg(videoBuffer)
        .on("end", function () {
          resolve("ok");
        })
        .on("error", function (err: any) {
          reject(err);
        })
        .output(framesPath)
        .run();
    });
  }

  public async makeVideo(
    imagesStream: Readable,
    fps: number,
    videoPath: string,
    audioPath: string
  ) {
    return new Promise((resolve, reject) => {
      this.ffmpeg(imagesStream)
        .inputFPS(fps) //same as original video to match with audio
        .input(audioPath)
        .on("end", function () {
          resolve("ok");
        })
        .on("error", function (err: any) {
          reject(err);
        })
        .outputOptions("-pix_fmt yuv420p")
        .save(videoPath);
    });
  }

  public async makeMuteVideo(
    imagesStream: Readable,
    fps: number,
    videoPath: string
  ) {
    return new Promise((resolve, reject) => {
      this.ffmpeg(imagesStream)
        .inputFPS(fps)
        .on("end", function () {
          resolve("ok");
        })
        .on("error", function (err: any) {
          reject(err);
        })
        .outputOptions("-pix_fmt yuv420p")
        .save(videoPath);
    });
  }
}
