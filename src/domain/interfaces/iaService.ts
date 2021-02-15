import { FaceDetailList } from "aws-sdk/clients/rekognition";
import { Result } from "../Result";

export interface IAService {
  getDataFacesImageS3(
    s3key: string,
    bucketName: string
  ): Promise<Result<FaceDetailList>>;
  getDataFacesImageBuffer(buffer: Buffer): Promise<Result<FaceDetailList>>;
}
