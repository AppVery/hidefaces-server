import { APIGatewayProxyResult } from 'aws-lambda';

type GenericObject = { [key: string]: unknown };
type APIBuildResponse = (
  statusCode: number,
  body: GenericObject,
  headers?: GenericObject,
) => APIGatewayProxyResult;

const buildResponse: APIBuildResponse = (statusCode, body, headers) => {
  const defaultHeaders: GenericObject = {
    'Access-Control-Allow-Origin': '*', //process.env.ACCESS_CONTROL_ALLOW_ORIGIN
    'Access-Control-Allow-Credentials': true,
    'Content-Type': 'application/json',
  };
  return {
    statusCode,
    headers: headers ?? defaultHeaders,
    body: JSON.stringify(body),
  } as APIGatewayProxyResult;
};

const success = (body: GenericObject): APIGatewayProxyResult => {
  return buildResponse(200, body);
};
const failure = (body: GenericObject): APIGatewayProxyResult => {
  return buildResponse(500, body);
};

const custom: APIBuildResponse = (statusCode, body, headers) => {
  return buildResponse(statusCode, body, headers);
};

export default {
  success,
  failure,
  custom,
};
