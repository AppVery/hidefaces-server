import { Notify } from "./Notify";
import { Request, Response } from "./requestResponseDTO";
import getFilePaths from "../../utils/getFilePaths";
import { Result } from "../../domain/Result";
import { FileService } from "../../domain/interfaces/fileService";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SESClient } from "@aws-sdk/client-ses";
import { emailsContent } from "../../domain/content";

export class NotifySuccess extends Notify {
  constructor(
    database: DynamoDBClient,
    ses: SESClient,
    fileService: FileService
  ) {
    super(database, ses, fileService);
  }

  public async execute(request: Request): Promise<Result<Response>> {
    const { id } = request;
    this.id = id;

    const resultData = await this.getDataFromDatabase(id);

    if (resultData.isFailure) {
      return Result.combineFail(resultData, "[Error on database]");
    }

    const { email, extension, quantity } = resultData.value;

    const resultUrl = await this.getDownloadUrl(extension);

    if (resultUrl.isFailure) {
      return Result.combineFail(resultUrl, "[Error on temporal url]");
    }

    const url = resultUrl.value;

    const resultNotifyAdmin = await this.notifyAdmin(quantity);

    if (resultNotifyAdmin.isFailure) {
      return Result.combineFail(resultNotifyAdmin, "[ADMIN notify success]");
    }

    const resultNotifyClient = await this.notifyClient(email, url);

    if (resultNotifyClient.isFailure) {
      return Result.combineFail(resultNotifyClient, "[CLIENT notify success]");
    }

    return Result.ok<void>();
  }

  private async getDownloadUrl(extension: string): Promise<Result<string>> {
    const newFileName = `${this.id.substr(0, 10)}.${extension}`;
    const s3Key = getFilePaths.s3FinalVideo(this.id, extension);
    const bucketName = process.env.MAIN_BUCKET_NAME;
    const EXPIRATION_TIME = 60 * 60 * 24; //1 day

    return await this.fileService.getTempDownloadUrl(
      bucketName,
      s3Key,
      newFileName,
      EXPIRATION_TIME
    );
  }

  private async notifyClient(
    email: string,
    url: string
  ): Promise<Result<void>> {
    const {
      subject,
      getTitle,
      getClientText,
      getClientContent,
    } = emailsContent.success;
    const title = getTitle(this.id);
    const text = getClientText(url);
    const content = getClientContent(url);
    const html = this.getHtml(title, content, true);

    return await this.sendEmail(email, subject, text, html);
  }

  private async notifyAdmin(quantity: string): Promise<Result<void>> {
    const { subject, getTitle, getAdminText } = emailsContent.success;

    const title = getTitle(this.id);
    const text = getAdminText(quantity);
    const html = this.getHtml(title, text);

    return await this.sendEmail(this.ADMIN_EMAIL, subject, text, html);
  }
}
