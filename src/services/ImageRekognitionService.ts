import { IAService } from "../domain/interfaces/iaService";
import { Result } from "../domain/Result";
import { resultTryAWSSendCommand } from "../utils/resultTryAWSRequest";
import {
  RekognitionClient,
  DetectFacesCommand,
  DetectFacesCommandInput,
  DetectFacesResponse,
  FaceDetail,
} from "@aws-sdk/client-rekognition";

export class ImageRekognitionService implements IAService {
  private service: RekognitionClient;

  constructor(service: RekognitionClient) {
    this.service = service;
  }

  async getDataFacesImageS3(
    s3key: string,
    bucketName: string
  ): Promise<Result<FaceDetail[]>> {
    const input: DetectFacesCommandInput = {
      Image: {
        S3Object: {
          Bucket: bucketName,
          Name: s3key,
        },
      },
      Attributes: ["ALL"],
    };

    const awsResult = await resultTryAWSSendCommand<DetectFacesResponse>(
      this.service,
      new DetectFacesCommand(input)
    );

    if (awsResult.isFailure) {
      return Result.fail<FaceDetail[]>(awsResult.error, awsResult.code);
    }

    return Result.ok<FaceDetail[]>(awsResult.value.FaceDetails);
  }

  async getDataFacesImageBuffer(buffer: Buffer): Promise<Result<FaceDetail[]>> {
    const input: DetectFacesCommandInput = {
      Image: {
        Bytes: buffer,
      },
      Attributes: ["ALL"],
    };

    const awsResult = await resultTryAWSSendCommand<DetectFacesResponse>(
      this.service,
      new DetectFacesCommand(input)
    );

    if (awsResult.isFailure) {
      return Result.fail<FaceDetail[]>(awsResult.error, awsResult.code);
    }

    return Result.ok<FaceDetail[]>(awsResult.value.FaceDetails);
  }
}
