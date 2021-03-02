import { Notify } from "./Notify";
import { Request, Response } from "./requestResponseDTO";
import { Result } from "../../domain/Result";
import { FileService } from "../../domain/interfaces/fileService";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SESClient } from "@aws-sdk/client-ses";

export class NotifyError extends Notify {
  constructor(
    database: DynamoDBClient,
    ses: SESClient,
    fileService: FileService
  ) {
    super(database, ses, fileService);
  }

  public async execute(request: Request): Promise<Result<Response>> {
    const { id, error } = request;
    this.id = id;

    const resultData = await this.getDataFromDatabase(id);

    if (resultData.isFailure) {
      return Result.combineFail(resultData, "[Error on database]");
    }

    const { email } = resultData.value;

    const resultNotifyAdmin = await this.notifyAdmin(error);

    if (resultNotifyAdmin.isFailure) {
      return Result.combineFail(resultNotifyAdmin, "[ADMIN notify error]");
    }

    const resultNotifyClient = await this.notifyClient(email);

    if (resultNotifyClient.isFailure) {
      return Result.combineFail(resultNotifyClient, "[CLIENT notify error]");
    }

    return Result.ok<void>();
  }

  private async notifyClient(email: string): Promise<Result<void>> {
    const subject = `Error on video ${this.id} from ${this.APP_NAME}`;
    const text = `Unexpected error when processing the video, so we proceed to make the refund of the money as soon as possible.`;
    const html = this.getHtml(subject, text);

    return await this.sendEmail(email, subject, text, html);
  }

  private async notifyAdmin(error: string): Promise<Result<void>> {
    const errorData: {
      errorMessage: string;
      trace: string[];
    } = JSON.parse(error);

    const { errorMessage, trace } = errorData;
    const subject = `Error on video ${this.id} from ${this.APP_NAME}`;
    const content = `<p>${errorMessage}</p><ul>${trace.map(
      (line) => `<li>${line}</li>`
    )}</ul>`;
    const html = this.getHtml(subject, content);

    return await this.sendEmail(this.ADMIN_EMAIL, subject, errorMessage, html);
  }
}
