import { APIGatewayProxyResult, S3Event } from "aws-lambda";
import baseAPIResponses from "../utils/baseApiResponses";
import { parseString } from "../utils/validations";
import * as AWS from "aws-sdk";

const stepfunctions = new AWS.StepFunctions({});

export const handler = async (
  event: S3Event
): Promise<APIGatewayProxyResult> => {
  try {
    const { key } = event.Records[0].s3.object;
    const eventKey = parseString("S3key", key);
    const [, , id, filename] = eventKey.split("/");

    const data = {
      id,
      filename,
      email: "cianespablo@gmail.com",
      played: "false",
    };

    const params = {
      stateMachineArn: process.env.STATE_MACHINE_ARN,
      input: JSON.stringify(data),
    };

    const result = await stepfunctions.startExecution(params).promise();

    return baseAPIResponses.success({ response: result });
  } catch (error) {
    return baseAPIResponses.failure({ response: error.toString() });
  }
};
