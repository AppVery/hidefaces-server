import { Request, Response } from "./requestResponseDTO";
import { Result } from "../../domain/Result";
import { UseCase } from "../../domain/useCase";
import getFilePaths from "../../utils/getFilePaths";
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

type Session = Stripe.Response<Stripe.Checkout.Session>;

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
    const { email, extension, amount, origin } = request;

    const resultGetPaySession = await this.getPaySession(email, amount, origin);

    if (resultGetPaySession.isFailure) {
      return Result.fail<Response>(
        resultGetPaySession.error,
        resultGetPaySession.code
      );
    }

    const session = resultGetPaySession.value;
    const id = session.id.split("_")[2];

    const resultSaveData = await this.saveOperation(
      id,
      email,
      extension,
      amount
    );

    if (resultSaveData.isFailure) {
      return Result.combineFail<Response>(
        resultSaveData,
        "[Payment - save operation]"
      );
    }

    const resultTempUrl = await this.getTempUploadUrl(id, extension);

    if (resultTempUrl.isFailure) {
      return Result.combineFail<Response>(
        resultTempUrl,
        "[Payment - getting url]"
      );
    }

    const response: Response = {
      id: session.id,
      url: resultTempUrl.value,
    };

    return Result.ok<Response>(response);
  }

  private async getPaySession(
    email: string,
    amount: number,
    origin: string
  ): Promise<Result<Session>> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer_email: email,
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: "HideFaces.app",
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cancel?session_id={CHECKOUT_SESSION_ID}`,
      });

      /* eslint-disable  no-console */
      console.log("session", session);

      return Result.ok(session);
    } catch (error) {
      const { statusCode, message } = error;
      return Result.fail(`Payment status: ${message}`, statusCode);
    }
  }

  private async saveOperation(
    id: string,
    email: string,
    extension: string,
    amount: number
  ): Promise<Result<void>> {
    try {
      const input: PutItemCommandInput = {
        TableName: process.env.MAIN_TABLE_NAME,
        Item: {
          pk: { S: `PY-${id}` },
          email: { S: email },
          extension: { S: extension },
          amount: { N: amount.toString() },
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
        Key: getFilePaths.s3SourceVideo(id, extension),
      };
      const url = await this.getTempUrl(this.s3, new PutObjectCommand(input), {
        expiresIn: 120,
      });
      return Result.ok<string>(url);
    } catch (error) {
      const { statusCode, message } = error;
      return Result.fail<any>(`Storage status: ${message}`, statusCode);
    }
  }
}
