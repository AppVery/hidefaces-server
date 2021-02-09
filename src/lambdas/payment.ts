import useCase from "../useCases/payment";
import { Request } from "../useCases/payment/requestResponseDTO";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import baseAPIResponses from "../utils/baseApiResponses";
import {
  hasValue,
  parseEmail,
  parseString,
  parseExtension,
} from "../utils/validations";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = event.body && JSON.parse(event.body);

    if (
      !hasValue(body.email) ||
      !hasValue(body.token) ||
      !hasValue(body.filename)
    ) {
      throw new Error("Invalid request");
    }

    const request: Request = {
      email: parseEmail("email", body.email),
      token: parseString("token", body.token),
      extension: parseExtension("filename", body.filename),
    };

    const result = await useCase.execute(request);

    if (result.isFailure) {
      return baseAPIResponses.custom(result.code, {
        response: result.error,
      });
    }

    return baseAPIResponses.success({ response: result.value });
  } catch (error) {
    return baseAPIResponses.failure({ response: error.toString() });
  }
};
