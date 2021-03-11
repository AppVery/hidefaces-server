import { Result } from "../Result";

export interface FileService {
  getTempUploadUrl(
    bucketName: string,
    key: string,
    time?: number
  ): Promise<Result<string>>;
  getTempDownloadUrl(
    bucketName: string,
    key: string,
    newFileName?: string,
    time?: number
  ): Promise<Result<string>>;
  saveStringData(
    bucketName: string,
    key: string,
    data: string
  ): Promise<Result<void>>;
  saveBuffer(
    bucketName: string,
    key: string,
    buffer: Buffer
  ): Promise<Result<void>>;
  getS3Buffer(bucketName: string, key: string): Promise<Result<Buffer>>;
  getS3Stream(bucketName: string, key: string): Promise<Result<Buffer>>;
  deleteS3file(bucketName: string, key: string): Promise<Result<void>>;
}
