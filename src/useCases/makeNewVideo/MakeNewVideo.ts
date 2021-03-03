import { Request, Response } from "./requestResponseDTO";
import { VideoData } from "../../domain/interfaces/types";
import { VideoService } from "../../domain/interfaces/videoService";
import { FileService } from "../../domain/interfaces/fileService";
import { Result } from "../../domain/Result";
import { UseCase } from "../../domain/useCase";
import { Readable } from "stream";
import getFilePaths, {
  makeCleanTemporalFolder,
} from "../../utils/getFilePaths";
import * as fs from "fs";

export class MakeNewVideo implements UseCase<Request, Response> {
  private bucketName = process.env.MAIN_BUCKET_NAME;
  private fileService: FileService;
  private videoService: VideoService;

  constructor(fileService: FileService, videoService: VideoService) {
    this.fileService = fileService;
    this.videoService = videoService;
  }

  public async execute(request: Request): Promise<Result<Response>> {
    const { videoData } = request;
    const { id, fps, totalFrames } = videoData;

    const audioS3Key = getFilePaths.s3TmpAudio(id);
    const videoPath = getFilePaths.localFile(id, videoData.filename);
    const audioPath = getFilePaths.localAudio(id);

    try {
      await makeCleanTemporalFolder(id);

      const imagesStream = this.getImagesStream(id, totalFrames);

      if (videoData.audio) {
        const resultAudio = await this.fileService.getS3Buffer(
          this.bucketName,
          audioS3Key
        );

        if (resultAudio.isSuccess) {
          await fs.promises.writeFile(audioPath, resultAudio.value);

          await this.videoService.makeVideo(
            imagesStream,
            fps,
            videoPath,
            audioPath
          );
        } else {
          await this.videoService.makeMuteVideo(imagesStream, fps, videoPath);
        }
      } else {
        await this.videoService.makeMuteVideo(imagesStream, fps, videoPath);
      }
    } catch (error) {
      return Result.fail<Response>(`[MakeNewVideo] ${error.toString()}`);
    }

    const resultSaveVideo = await this.saveVideoOnS3(videoData, videoPath);

    if (resultSaveVideo.isFailure) {
      return Result.combineFail(
        resultSaveVideo,
        "[MakeNewVideo] - saving new video on S3"
      );
    }

    return Result.ok<Response>(videoData);
  }

  private getImagesStream(id: string, totalFrames: number) {
    let i = 1;
    const fileService = this.fileService;
    const bucketName = this.bucketName;

    return new Readable({
      async read() {
        let error: boolean;
        do {
          const s3key = getFilePaths.s3TmpFrame(id, i);
          const frame = await fileService.getS3Buffer(bucketName, s3key);
          if (frame.isSuccess) {
            this.push(frame.value);
            error = false;
          } else {
            /* eslint-disable  no-console */
            console.log("frame error", i, frame);
            error = true;
          }
          i++;
          if (i > totalFrames) {
            this.push(null);
            error = false;
          }
        } while (error);
      },
    });
  }

  private async saveVideoOnS3(
    videoData: VideoData,
    videoPath: string
  ): Promise<Result<void>> {
    const videoBuffer = await fs.promises.readFile(videoPath);
    const s3key = getFilePaths.s3FinalVideo(videoData.id, videoData.extension);

    return await this.fileService.saveBuffer(
      this.bucketName,
      s3key,
      videoBuffer
    );
  }
}
