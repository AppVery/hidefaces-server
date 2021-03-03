import { VideoService } from "../domain/interfaces/videoService";
import * as fluentFfmpeg from "fluent-ffmpeg";

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
}
