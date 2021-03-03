import { Request, Response } from "./requestResponseDTO";
import { VideoData } from "../../domain/interfaces/types";
import { VideoService } from "../../domain/interfaces/videoService";
import { FileService } from "../../domain/interfaces/fileService";
import { Result } from "../../domain/Result";
import { UseCase } from "../../domain/useCase";
import { delay } from "../../utils/validations";
import getFilePaths, {
  makeCleanTemporalFolder,
} from "../../utils/getFilePaths";
import { Chokidar } from "./index";
import * as fs from "fs";

export class ExplodeVideo implements UseCase<Request, Response> {
  private bucketName = process.env.MAIN_BUCKET_NAME;
  private fileService: FileService;
  private videoService: VideoService;
  private chokidar: Chokidar;

  constructor(
    fileService: FileService,
    videoService: VideoService,
    chokidar: Chokidar
  ) {
    this.fileService = fileService;
    this.videoService = videoService;
    this.chokidar = chokidar;
  }

  public async execute(request: Request): Promise<Result<Response>> {
    const { videoData } = request;
    const { id, s3key } = videoData;

    const resultVideo = await this.fileService.getS3Stream(
      this.bucketName,
      s3key
    );

    if (resultVideo.isFailure) {
      return Result.combineFail<VideoData>(
        resultVideo,
        "[ExplodeVideo - getting video from S3]"
      );
    }

    const tmpPath = getFilePaths.localFolder(id);
    const audioPath = getFilePaths.localAudio(id);
    const framesPath = getFilePaths.localFrames(id);

    try {
      await makeCleanTemporalFolder(id);

      this.initWatcher(tmpPath, videoData);

      if (videoData.audio) {
        await this.videoService.explodeVideo(
          resultVideo.value,
          framesPath,
          audioPath
        );
        await this.saveAudioOnS3(videoData.id, audioPath);
      } else {
        await this.videoService.explodeMuteVideo(resultVideo.value, framesPath);
      }

      await this.waitWatcher(tmpPath);
    } catch (error) {
      return Result.fail<VideoData>(`[ExplodeVideo] ${error.toString()}`);
    }

    return Result.ok<VideoData>(videoData);
  }

  private initWatcher = (path: string, videoData: VideoData): void => {
    const bucketName = this.bucketName;
    const fileService = this.fileService;

    const watcher = this.chokidar.watch(path, {
      ignored: /^\./,
      persistent: true,
      awaitWriteFinish: true,
    });
    watcher.on("add", async function (path: string) {
      const fileBuffer = await fs.promises.readFile(path);
      const filename = path.split("/")[3];
      const Key = getFilePaths.s3TmpVideo(videoData.id, filename);

      if ("audio.mp3" === filename || videoData.filename === filename) return;

      //save frame on S3
      await fileService.saveBuffer(bucketName, Key, fileBuffer);
      await fs.promises.unlink(path);
    });
  };

  private async waitWatcher(path: string) {
    //await until remove (unlink) all files
    let totalFiles = 0;
    do {
      await delay(1);
      const files = await fs.promises.readdir(path);
      totalFiles = files.length;
    } while (totalFiles > 0);
  }

  private async saveAudioOnS3(id: string, path: string): Promise<void> {
    const audioBuffer = await fs.promises.readFile(path);
    const audioS3Key = getFilePaths.s3TmpAudio(id);

    if (audioBuffer) {
      await this.fileService.saveBuffer(
        this.bucketName,
        audioS3Key,
        audioBuffer
      );
    }

    await fs.promises.unlink(path);
  }
}
