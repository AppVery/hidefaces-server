import checkVideoSource from "../../useCases/checkVideoSource";
import { Request } from "../../useCases/checkVideoSource/requestResponseDTO";
import { VideoData } from "../../domain/interfaces/types";

type Event = {
  Input: {
    id: string;
    filename: string;
    s3key: string;
  };
};

export const handler = async (event: Event): Promise<VideoData> => {
  const { id, filename, s3key } = event.Input;

  const request: Request = { id, filename, s3key };

  const result = await checkVideoSource.execute(request);

  if (result.isFailure) {
    throw Error(result.error);
  }

  return result.value;
};
