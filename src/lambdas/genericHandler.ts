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

export const getGenericHandler = <Response>(
  useCase: UseCase<Request, Response>
) => {
  return async (event: Event): Promise<Response> => {
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
