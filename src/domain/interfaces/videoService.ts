import { Readable } from "stream";

export interface VideoService {
  getMetadata(videoBuffer: Buffer): Promise<unknown>;
  getVideoFrame(
    videoPath: string,
    screenshotFilename: string,
    folder: string
  ): Promise<unknown>;
  changeVideoSource(
    path: string,
    percentage: number,
    fps: number,
    newPath: string
  ): Promise<unknown>;
  explodeVideo(
    videoBuffer: Buffer,
    framesPath: string,
    audioPath: string
  ): Promise<unknown>;
  explodeMuteVideo(videoBuffer: Buffer, framesPath: string): Promise<unknown>;
  makeVideo(
    imagesStream: Readable,
    fps: number,
    videoPath: string,
    audioPath: string
  ): Promise<unknown>;
  makeMuteVideo(
    imagesStream: Readable,
    fps: number,
    videoPath: string
  ): Promise<unknown>;
}
