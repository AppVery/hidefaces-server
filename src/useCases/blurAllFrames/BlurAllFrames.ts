import { Request, Response } from "./requestResponseDTO";
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

  public async execute(request: Request): Promise<Result<Response>> {
    const {
      videoData,
      framesData: { mapper, facesPositions },
    } = request;

    for (let i = 1; i <= videoData.totalFrames; i++) {
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
