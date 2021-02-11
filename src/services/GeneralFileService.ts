import { FileService } from "../domain/interfaces/fileService";
import { resultTryAWSSendCommand } from "../utils/resultTryAWSRequest";
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
  PutObjectCommandOutput,
  GetObjectCommand,
  GetObjectCommandInput,
  GetObjectCommandOutput,
  DeleteObjectCommand,
  DeleteObjectCommandInput,
  DeleteObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Result } from "../domain/Result";

export class GeneralFileService implements FileService {
  private s3: S3Client;
  private getTempUrl: typeof getSignedUrl;

  constructor(s3: S3Client, getTempUrl: typeof getSignedUrl) {
    this.s3 = s3;
    this.getTempUrl = getTempUrl;
  }

  public async getTempUploadUrl(
    bucketName: string,
    key: string,
    time = 60
  ): Promise<Result<string>> {
    const command: PutObjectCommandInput = {
      Bucket: bucketName,
      Key: key,
    };

    try {
      const url = await this.getTempUrl(
        this.s3,
        new PutObjectCommand(command),
        {
          expiresIn: time,
        }
      );
      return Result.ok<string>(url);
    } catch (error) {
      const { statusCode, message } = error;
      return Result.fail<any>(`Service status: ${message}`, statusCode);
    }
  }

  public async getTempDownloadUrl(
    bucketName: string,
    key: string,
    newFileName?: string,
    time = 60 * 60 * 24 //1 day
  ): Promise<Result<string>> {
    const command: GetObjectCommandInput = {
      Bucket: bucketName,
      Key: key,
    };

    if (newFileName) {
      command[
        "ResponseContentDisposition"
      ] = `attachment; filename ="${newFileName}"`;
    }

    try {
      const url = await this.getTempUrl(
        this.s3,
        new GetObjectCommand(command),
        {
          expiresIn: time,
        }
      );
      return Result.ok<string>(url);
    } catch (error) {
      const { statusCode, message } = error;
      return Result.fail<any>(`Service status: ${message}`, statusCode);
    }
  }

  public async saveBuffer(
    bucketName: string,
    key: string,
    buffer: Buffer
  ): Promise<Result<void>> {
    const command: PutObjectCommandInput = {
      Bucket: bucketName,
      Key: key,
      Body: buffer,
    };
    const awsResult = await resultTryAWSSendCommand<PutObjectCommandOutput>(
      this.s3,
      new PutObjectCommand(command)
    );

    if (awsResult.isFailure) {
      return Result.continueFail<void>(awsResult);
    }

    return Result.ok<void>();
  }

  public async getS3Buffer(
    bucketName: string,
    key: string
  ): Promise<Result<Buffer>> {
    const command: GetObjectCommandInput = {
      Bucket: bucketName,
      Key: key,
    };
    const awsResult = await resultTryAWSSendCommand<GetObjectCommandOutput>(
      this.s3,
      new GetObjectCommand(command)
    );

    if (awsResult.isFailure) {
      return Result.continueFail<any>(awsResult);
    }

    const imageStream = awsResult.value.Body;

    if (!imageStream) {
      return Result.fail<any>("Empty buffer");
    }

    const chunks = [];
    for await (const chunk of imageStream as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return Result.ok<any>(buffer);
  }

  public async getS3Stream(
    bucketName: string,
    key: string
  ): Promise<Result<Buffer>> {
    const command: GetObjectCommandInput = {
      Bucket: bucketName,
      Key: key,
    };
    const awsResult = await resultTryAWSSendCommand<GetObjectCommandOutput>(
      this.s3,
      new GetObjectCommand(command)
    );

    if (awsResult.isFailure) {
      return Result.continueFail<any>(awsResult);
    }

    const fileStream = awsResult.value.Body;

    if (!fileStream) {
      return Result.fail<any>("Empty stream");
    }

    return Result.ok<any>(fileStream);
  }

  public async deleteS3file(
    bucketName: string,
    key: string
  ): Promise<Result<void>> {
    const command: DeleteObjectCommandInput = {
      Bucket: bucketName,
      Key: key,
    };
    const awsResult = await resultTryAWSSendCommand<DeleteObjectCommandOutput>(
      this.s3,
      new DeleteObjectCommand(command)
    );

    if (awsResult.isFailure) {
      return Result.continueFail<void>(awsResult);
    }

    return Result.ok<void>();
  }
}
