import { NotifySuccess } from "./NotifySuccess";
import { NotifyError } from "./NotifyError";
import { generalFileService } from "../../services";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SESClient } from "@aws-sdk/client-ses";

const awsDynamoDB = new DynamoDBClient({});
const awsSes = new SESClient({});

export const notifySuccess = new NotifySuccess(
  awsDynamoDB,
  awsSes,
  generalFileService
);

export const notifyError = new NotifyError(
  awsDynamoDB,
  awsSes,
  generalFileService
);
