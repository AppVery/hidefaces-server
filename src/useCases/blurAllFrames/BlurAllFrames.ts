import { Request, Response } from "./requestResponseDTO";
import { Position } from "../../domain/interfaces/imageService";
import { VideoData } from "../../domain/interfaces/types";
import { FileService } from "../../domain/interfaces/fileService";
import { Operations } from "../../domain/interfaces/operations";
import { Result } from "../../domain/Result";
import { UseCase } from "../../domain/useCase";
import getFilePaths from "../../utils/getFilePaths";

export class BlurAllFrames implements UseCase<Request, Response> {
  private bucketName = process.env.MAIN_BUCKET_NAME;
  private fileService: FileService;
  private operation: Operations;

  constructor(fileService: FileService, operation: Operations) {
    this.fileService = fileService;
    this.operation = operation;
  }

  private getInitLastFrame(index: number, totalFrames: number): number[] {
    const slice = Math.floor(totalFrames / 4);

    switch (index) {
      case 1:
        return [1, slice];

      case 2:
        return [slice + 1, slice * 2];

      case 3:
        return [slice * 2 + 1, slice * 3];

      case 4:
        return [slice * 3 + 1, totalFrames];

      default:
        return [1, totalFrames];
    }
  }

  public async execute(request: Request): Promise<Result<Response>> {
    const { index, videoData } = request;

    const s3key = getFilePaths.s3FacesData(videoData.id);
    const resultFramesData = await this.fileService.getS3Buffer(
      this.bucketName,
      s3key
    );

    if (resultFramesData.isFailure) {
      return Result.combineFail(
        resultFramesData,
        "[BlurAllframes: getting data from S3]"
      );
    }

    const [initFrame, lastFrame] = this.getInitLastFrame(
      index,
      videoData.totalFrames
    );

    const data = JSON.parse(Buffer.from(resultFramesData.value).toString());
    const mapper: Map<number, number> = new Map(data.mapper);
    const facesPositions: Map<number, Position[]> = new Map(
      data.facesPositions
    );

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
}
