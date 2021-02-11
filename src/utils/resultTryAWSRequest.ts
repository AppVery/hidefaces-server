import { Result } from '../domain/Result';

/* eslint-disable  @typescript-eslint/no-explicit-any */
export const resultTryAWSRequest = (
  request: (params: any) => Promise<any>,
): ((params: any) => Promise<Result<any>>) => {
  return async function (params: any): Promise<Result<any>> {
    try {
      const data = await request(params);
      return Result.ok<typeof data>(data);
    } catch (error) {
      const { statusCode, message } = error;
      return Result.fail<any>(`Service status: ${message}`, statusCode);
    }
  };
};

/* eslint-disable  @typescript-eslint/no-explicit-any */
export const resultTryAWSSendCommand = async <T>(
  client: { send: any },
  command: unknown,
): Promise<Result<T>> => {
  try {
    const data = await client.send(command);
    return Result.ok<T>(data);
  } catch (error) {
    const { statusCode, message } = error;
    return Result.fail<T>(`Service status: ${message}`, statusCode);
  }
};

export const resultTryAWSSendCommandVoid = async (
  client: { send: any },
  command: unknown,
): Promise<Result<void>> => {
  const awsResult = await resultTryAWSSendCommand<void>(client, command);

  if (awsResult.isFailure) {
    return Result.fail<void>(awsResult.error, awsResult.code);
  }

  return Result.ok<void>();
};
