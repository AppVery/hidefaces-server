import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GeneralFileService } from "./GeneralFileService";

const awsS3 = new S3Client({});
const awsDynamoDB = new DynamoDBClient({});

export const generalFileService = new GeneralFileService(awsS3, getSignedUrl);
