import { generalFileService } from "../../services";
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

const awsDynamoDB = new DynamoDBClient({});
const ses = new SESClient({});

const bucketName = process.env.MAIN_BUCKET_NAME;
const EXPIRATION_TIME = 60 * 60 * 24; //1 day

type Event = {
  Input: {
    Payload: {
      videoS3Key: string;
      id: string;
    };
  };
};

export const handler = async (event: Event): Promise<void> => {
  const { id, videoS3Key } = event.Input.Payload;

  const dbInput: GetItemCommandInput = {
    TableName: process.env.MAIN_TABLE_NAME,
    Key: {
      pk: { S: `PY-${id}` },
    },
  };

  const { Item } = await awsDynamoDB.send(new GetItemCommand(dbInput));
  const extension = Item.extension.S;
  const newFileName = `${id.substr(0, 10)}.${extension}`;

  const resultUrl = await generalFileService.getTempDownloadUrl(
    bucketName,
    videoS3Key,
    newFileName,
    EXPIRATION_TIME
  );
  const url = resultUrl.value;
  const email = Item.email.S;
  const subject = "Video from HideFaces.app";
  const text = `Hi, this is your temporal downloaded link of your video from HideFaces.app:`;
  const html = `<html><head><title>HideFaces.app</title></head><body><p><strong>${subject}</strong></p><div>${text}<br/><a href="${url}">Download video</a></div></body></html>`;
  /* eslint-disable  no-console */
  console.log("url ", url);

  const emailInput: SendEmailCommandInput = {
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Text: {
          Data: `${text} \n\n ${url}`,
        },
        Html: {
          Data: html,
        },
      },
      Subject: { Data: subject },
    },
    Source: "info@hidefaces.app",
  };

  try {
    await ses.send(new SendEmailCommand(emailInput));
    return;
  } catch (error) {
    /* eslint-disable  no-console */
    console.log("error sending email ", error);
    throw error;
  }
};
