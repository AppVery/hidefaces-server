import { Request, Response } from "./requestResponseDTO";
import { Result } from "../../domain/Result";
import { UseCase } from "../../domain/useCase";
import { FileService } from "../../domain/interfaces/fileService";
import {
  DynamoDBClient,
  GetItemCommand,
  GetItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import {
  SESClient,
  SendEmailCommandInput,
  SendEmailCommand,
} from "@aws-sdk/client-ses";

type Data = {
  email: string;
  extension: string;
  quantity: string;
};

export abstract class Notify implements UseCase<Request, Response> {
  protected database: DynamoDBClient;
  protected ses: SESClient;
  protected fileService: FileService;
  protected id: string;
  protected APP_NAME = "HideFaces.app";
  protected ADMIN_EMAIL = "admin@hidefaces.app";
  private INFO_EMAIL = "info@hidefaces.app";

  constructor(
    database: DynamoDBClient,
    ses: SESClient,
    fileService: FileService
  ) {
    this.database = database;
    this.ses = ses;
    this.fileService = fileService;
  }

  abstract execute(request: Request): Promise<Result<Response>>;

  protected async getDataFromDatabase(id: string): Promise<Result<Data>> {
    try {
      const dbInput: GetItemCommandInput = {
        TableName: process.env.MAIN_TABLE_NAME,
        Key: {
          pk: { S: `PY-${id}` },
        },
      };

      const result = await this.database.send(new GetItemCommand(dbInput));

      if (!result.Item) {
        return Result.fail<Data>("Not item on database", 404);
      }

      const Item = result.Item;
      const data = {
        email: Item.email.S,
        extension: Item.extension.S,
        quantity: Item.quantity.N,
      };

      return Result.ok<Data>(data);
    } catch (error) {
      const { statusCode, message } = error;
      return Result.fail<Data>(`Database status: ${message}`, statusCode);
    }
  }

  protected getHtml = (title: string, content: string): string => {
    return `<html><head><title>${this.APP_NAME}</title></head><body><p><strong>${title}</strong></p><div>${content}</div></body></html>`;
  };

  protected async sendEmail(
    email: string,
    subject: string,
    text: string,
    html: string
  ): Promise<Result<void>> {
    try {
      const emailInput: SendEmailCommandInput = {
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Body: {
            Text: {
              Data: text,
            },
            Html: {
              Data: html,
            },
          },
          Subject: { Data: subject },
        },
        Source: this.INFO_EMAIL,
      };

      await this.ses.send(new SendEmailCommand(emailInput));
      return Result.ok<void>();
    } catch (error) {
      const { statusCode, message } = error;
      return Result.fail<void>(`SendEmail status: ${message}`, statusCode);
    }
  }
}
