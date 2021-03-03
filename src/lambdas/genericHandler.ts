import { VideoData } from "../domain/interfaces/types";
import { UseCase } from "../domain/useCase";

type Event = {
  Input: {
    Payload: VideoData;
  };
};

type Request = {
  videoData: VideoData;
};

type Response = VideoData;

export const getGenericHandler = (useCase: UseCase<Request, Response>) => {
  return async (event: Event): Promise<VideoData> => {
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
};
