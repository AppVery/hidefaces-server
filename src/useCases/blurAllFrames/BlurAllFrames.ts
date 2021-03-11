import { Request, Response } from "./requestResponseDTO";
import { Position } from "../../domain/interfaces/imageService";
import { VideoData } from "../../domain/interfaces/types";
import { FileService } from "../../domain/interfaces/fileService";
import { Operations } from "../../domain/interfaces/operations";
import { Result } from "../../domain/Result";
import { UseCase } from "../../domain/useCase";
import getFilePaths from "../../utils/getFilePaths";
import config from "../../domain/config";

export class BlurAllFrames implements UseCase<Request, Response> {
  private bucketName = process.env.MAIN_BUCKET_NAME;
  private fileService: FileService;
  private operation: Operations;
  private INTERVAL = config.INTERVAL;

  constructor(fileService: FileService, operation: Operations) {
    this.fileService = fileService;
    this.operation = operation;
  }

  public async execute(request: Request): Promise<Result<Response>> {
    const { index, videoData, facesPositions } = request;

    const mapper = this.getMapper(videoData.totalFrames, facesPositions);

    const middleFrame = Math.floor(videoData.totalFrames / 2);
    const initFrame = 1 === index ? 1 : middleFrame + 1;
    const lastFrame = 1 === index ? middleFrame : videoData.totalFrames;

    for (let i = initFrame; i <= lastFrame; i++) {
      const frameWithData = mapper.get(i);
      const frameFacesPositions = facesPositions.get(frameWithData);

      if (!frameFacesPositions || frameFacesPositions.length === 0) {
        continue;
      }

      const frameS3key = getFilePaths.s3TmpFrame(videoData.id, i);
      const resultFrameBuffer = await this.fileService.getS3Buffer(
        this.bucketName,
        frameS3key
      );

      if (resultFrameBuffer.isSuccess) {
        const resultOperation = await this.operation.doTransformation(
          resultFrameBuffer.value,
          frameFacesPositions
        );

        if (resultOperation.isSuccess) {
          await this.fileService.saveBuffer(
            this.bucketName,
            frameS3key,
            resultOperation.value
          );
        }
      }
    }

    return Result.ok<VideoData>(videoData);
  }

  private getMapper(
    totalFrames: number,
    facesPositions: Map<number, Position[]>
  ): Map<number, number> {
    const mapper = new Map<number, number>();
    let frameWithData = 1;

    for (let i = 1; i <= totalFrames; i++) {
      if (i >= frameWithData + this.INTERVAL / 2) {
        frameWithData = frameWithData + this.INTERVAL;
      }

      const frameToMap = facesPositions.has(frameWithData)
        ? frameWithData
        : frameWithData - this.INTERVAL;

      mapper.set(i, frameToMap);
    }

    return mapper;
  }
}
