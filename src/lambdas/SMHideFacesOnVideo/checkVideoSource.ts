import checkVideoSource from "../../useCases/checkVideoSource";
import { Request } from "../../useCases/checkVideoSource/requestResponseDTO";
import { VideoData } from "../../domain/interfaces/types";

type Event = {
  Input: Request;
};

export const handler = async (event: Event): Promise<VideoData> => {
  const { id, extension } = event.Input;

  const request: Request = { id, extension };

  const result = await checkVideoSource.execute(request);

  if (result.isFailure) {
    throw Error(result.error);
  }

  return result.value;
};
