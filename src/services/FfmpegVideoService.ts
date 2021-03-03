import { VideoService } from "../domain/interfaces/videoService";
import * as fluentFfmpeg from "fluent-ffmpeg";
import { Readable } from "stream";

export class FfmpegVideoService implements VideoService {
  private ffmpeg = fluentFfmpeg;

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
