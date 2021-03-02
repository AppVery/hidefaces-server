import { APIGatewayProxyResult, S3Event } from "aws-lambda";
import baseAPIResponses from "../utils/baseApiResponses";
import { StepFunctions } from "aws-sdk";

const stepfunctions = new StepFunctions({});

export const handler = async (
  event: S3Event
): Promise<APIGatewayProxyResult> => {
  try {
    const s3key = event.Records[0].s3.object.key;
    const [, , id, filename] = s3key.split("/");
    const data = {
      id,
      filename,
      s3key,
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
