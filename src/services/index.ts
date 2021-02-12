import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GeneralFileService } from "./GeneralFileService";

const awsS3 = new S3Client({});

export const generalFileService = new GeneralFileService(awsS3, getSignedUrl);
