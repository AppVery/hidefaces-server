import { Payment } from "./Payment";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
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

export default new Payment(awsDynamoDB, stripe);
