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
import { emailsContent } from "../../domain/content";

type Data = {
  email: string;
  extension: string;
  amount: string;
};

export abstract class Notify implements UseCase<Request, Response> {
  protected database: DynamoDBClient;
  protected ses: SESClient;
  protected fileService: FileService;
  protected id: string;
  protected ADMIN_EMAIL = "infoappvery@gmail.com";
  private SOURCE_EMAIL = "HideFaces.app <info@hidefaces.app>";

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
        amount: Item.amount.N,
      };

      return Result.ok<Data>(data);
    } catch (error) {
      const { statusCode, message } = error;
      return Result.fail<Data>(`Database status: ${message}`, statusCode);
    }
  }

  protected getHtml = (
    title: string,
    content: string,
    footer = false
  ): string => {
    return `<html>
    <head>
    <title>${title}</title>
    </head>
    <body>
    <p><strong>${title}</strong></p>
    <div>${content}</div>
    ${footer ? emailsContent.getFooter() : ""}
    </body>
    </html>`;
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
              Charset: "UTF-8",
              Data: text,
            },
            Html: {
              Charset: "UTF-8",
              Data: html,
            },
          },
          Subject: { Data: subject },
        },
        Source: this.SOURCE_EMAIL,
        ReplyToAddresses: [this.SOURCE_EMAIL],
      };

      await this.ses.send(new SendEmailCommand(emailInput));
      return Result.ok<void>();
    } catch (error) {
      const { statusCode, message } = error;
      return Result.fail<void>(`SendEmail status: ${message}`, statusCode);
    }
  }
}
