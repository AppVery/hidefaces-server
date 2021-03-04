import { Notify } from "./Notify";
import { Request, Response } from "./requestResponseDTO";
import { Result } from "../../domain/Result";
import { FileService } from "../../domain/interfaces/fileService";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SESClient } from "@aws-sdk/client-ses";
import { emailsContent } from "../../domain/content";

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

    const resultNotifyAdmin = await this.notifyAdmin(error);

    if (resultNotifyAdmin.isFailure) {
      return Result.combineFail(resultNotifyAdmin, "[NotifyError - admin]");
    }

    const resultData = await this.getDataFromDatabase(id);

    if (resultData.isFailure) {
      return Result.combineFail(resultData, "[NotifyError - database]");
    }

    const { email } = resultData.value;

    const resultNotifyClient = await this.notifyClient(email);

    if (resultNotifyClient.isFailure) {
      return Result.combineFail(resultNotifyClient, "[NotifyError - client]");
    }

    return Result.ok<void>();
  }

  private async notifyClient(email: string): Promise<Result<void>> {
    const { subject, getTitle, getClientText } = emailsContent.error;

    const title = getTitle(this.id);
    const text = getClientText();
    const html = this.getHtml(title, text);

    return await this.sendEmail(email, subject, text, html);
  }

  private async notifyAdmin(error: string): Promise<Result<void>> {
    const errorData: {
      errorMessage: string;
      trace: string[];
    } = JSON.parse(error);

    const { errorMessage, trace } = errorData;

    const {
      subject,
      getTitle,
      getAdminText,
      getAdminContent,
    } = emailsContent.error;

    const title = getTitle(this.id);
    const text = getAdminText(errorMessage);
    const content = getAdminContent(errorMessage, trace);
    const html = this.getHtml(title, content);

    return await this.sendEmail(this.ADMIN_EMAIL, subject, text, html);
  }
}
