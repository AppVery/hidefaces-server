import useCase from "../../useCases/explodeVideo";
import { Request } from "../../useCases/explodeVideo/requestResponseDTO";
import { VideoData } from "../../domain/interfaces/types";

type Event = {
  Input: {
    Payload: VideoData;
  };
};

export const handler = async (event: Event): Promise<VideoData> => {
  const videoData = event.Input.Payload;

  const request: Request = {
    videoData,
  };

  const result = await useCase.execute(request);

  if (result.isFailure) {
    throw Error(result.error);
  }

  return result.value;
};
