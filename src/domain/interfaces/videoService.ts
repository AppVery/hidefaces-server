export interface VideoService {
  explodeVideo(
    videoBuffer: Buffer,
    framesPath: string,
    audioPath: string
  ): Promise<unknown>;
  explodeMuteVideo(videoBuffer: Buffer, framesPath: string): Promise<unknown>;
}
