import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import baseAPIResponses from "../utils/baseApiResponses";
import { StepFunctions } from "aws-sdk";
import Stripe from "stripe";
import * as dotenv from "dotenv";

dotenv.config();

const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
const stripe = new Stripe(stripeKey, {
  apiVersion: "2020-08-27",
  typescript: true,
  maxNetworkRetries: 2,
});

const stepfunctions = new StepFunctions({});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const signature = event.headers["Stripe-Signature"];
    const endpointSecret = process.env.STRIPE_SECRET_WEBHOOK || "";
    const stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      endpointSecret
    );

    if ("checkout.session.completed" === stripeEvent.type) {
      const session = stripeEvent.data.object as { payment_intent: string };
      const data = {
        id: session.payment_intent.split("_")[1],
      };
      const params = {
        stateMachineArn: process.env.STATE_MACHINE_ARN,
        input: JSON.stringify(data),
      };

      await stepfunctions.startExecution(params).promise();
    } else {
      throw Error("stripe webhook error");
    }

    return baseAPIResponses.success({
      received: true,
    });
  } catch (error) {
    return baseAPIResponses.failure({ response: error.toString() });
  }
};
