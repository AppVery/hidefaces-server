import { Request, Response } from "./requestResponseDTO";
import { Result } from "../../domain/Result";
import { UseCase } from "../../domain/useCase";
import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Stripe from "stripe";

export class Payment implements UseCase<Request, Response> {
  private database: DynamoDBClient;
  private s3: S3Client;
  private getTempUrl: typeof getSignedUrl;
  private stripe: Stripe;

  constructor(
    database: DynamoDBClient,
    s3: S3Client,
    getTempUrl: typeof getSignedUrl,
    stripe: Stripe
  ) {
    this.database = database;
    this.s3 = s3;
    this.getTempUrl = getTempUrl;
    this.stripe = stripe;
  }

  public async execute(request: Request): Promise<Result<Response>> {
    const { email, token, extension } = request;

    const resultMakePayment = await this.makePayment(token);

    if (resultMakePayment.isFailure) {
      return Result.fail<Response>(
        resultMakePayment.error,
        resultMakePayment.code
      );
    }

    const { id, zip } = resultMakePayment.value;

    const resultSaveData = await this.saveOperation(id, email, extension, zip);

    if (resultSaveData.isFailure) {
      return Result.fail<Response>(resultSaveData.error, resultSaveData.code);
    }

    const resultTempUrl = await this.getTempUploadUrl(id, extension);

    if (resultTempUrl.isFailure) {
      return Result.fail<Response>(resultTempUrl.error, resultTempUrl.code);
    }

    const response: Response = {
      id,
      url: resultTempUrl.value,
    };

    return Result.ok<Response>(response);
  }

  private async makePayment(
    token: string
  ): Promise<Result<{ id: string; zip: string }>> {
    try {
      const charge = await this.stripe.charges.create({
        source: token,
        amount: 150,
        description: "HideFaces.app",
        currency: "eur",
      });
      const data = {
        id: charge.id.split("ch_")[1],
        zip: charge.billing_details.address?.postal_code,
      };
      return Result.ok(data);
    } catch (error) {
      const { statusCode, message } = error;
      return Result.fail(`Payment status: ${message}`, statusCode);
    }
  }

  private async saveOperation(
    id: string,
    email: string,
    extension: string,
    zip: string
  ): Promise<Result<void>> {
    try {
      const input: PutItemCommandInput = {
        TableName: process.env.MAIN_TABLE_NAME,
        Item: {
          pk: { S: `PY-${id}` },
          email: { S: email },
          extension: { S: extension },
          zip: { S: zip },
          createdAt: { S: Date.now().toString() },
        },
      };
      await this.database.send(new PutItemCommand(input));
      return Result.ok<void>();
    } catch (error) {
      const { statusCode, message } = error;
      return Result.fail<void>(`Database status: ${message}`, statusCode);
    }
  }

  private async getTempUploadUrl(
    id: string,
    extension: string
  ): Promise<Result<string>> {
    try {
      const input: PutObjectCommandInput = {
        Bucket: process.env.MAIN_BUCKET_NAME,
        Key: `videos/${id}/original-${id}.${extension}`,
      };
      const url = await this.getTempUrl(this.s3, new PutObjectCommand(input), {
        expiresIn: 60,
      });
      return Result.ok<string>(url);
    } catch (error) {
      const { statusCode, message } = error;
      return Result.fail<any>(`Storage status: ${message}`, statusCode);
    }
  }
}
