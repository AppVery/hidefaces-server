import { Request, Response } from "./requestResponseDTO";
import { Result } from "../../domain/Result";
import { UseCase } from "../../domain/useCase";
import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import Stripe from "stripe";

export class Payment implements UseCase<Request, Response> {
  private database: DynamoDBClient;
  private stripe: Stripe;

  constructor(database: DynamoDBClient, stripe: Stripe) {
    this.database = database;
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

    await this.saveOperation(id, email, extension, zip);

    const response: Response = {
      id,
      url: "https://.....",
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
}
