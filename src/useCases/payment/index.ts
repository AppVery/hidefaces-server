import { Payment } from "./Payment";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Stripe from "stripe";
import * as dotenv from "dotenv";

dotenv.config();

const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
const stripe = new Stripe(stripeKey, {
  apiVersion: "2020-08-27",
  typescript: true,
  maxNetworkRetries: 2,
});

const awsDynamoDB = new DynamoDBClient({});
const awsS3 = new S3Client({});

export default new Payment(awsDynamoDB, awsS3, getSignedUrl, stripe);
