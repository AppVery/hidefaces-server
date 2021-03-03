import { Readable } from "stream";

export interface VideoService {
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
