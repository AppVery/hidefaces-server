import useCase from "../useCases/payment";
import { Request } from "../useCases/payment/requestResponseDTO";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import baseAPIResponses from "../utils/baseApiResponses";
import {
  hasValue,
  parseEmail,
  parseExtension,
  parseNumber,
  parseString,
} from "../utils/validations";

const MIN_PRICE = 100;
const MAX_PRICE = 500;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = event.body && JSON.parse(event.body);

    if (
      !hasValue(body.email) ||
      !hasValue(body.filename) ||
      !hasValue(body.amount) ||
      !hasValue(body.origin)
    ) {
      throw new Error("Invalid request");
    }

    const request: Request = {
      email: parseEmail("email", body.email),
      extension: parseExtension("filename", body.filename),
      amount: parseNumber("amount", body.amount),
      origin: parseString("origin", body.origin),
    };

    if (request.amount < MIN_PRICE || request.amount > MAX_PRICE) {
      return baseAPIResponses.failure({ response: "Invalid amount" });
    }

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
