import { VideoData } from "../domain/interfaces/types";
import { Request } from "../useCases/blurAllFrames/requestResponseDTO";
import { UseCase } from "../domain/useCase";

type Event = {
  Input: {
    Payload: {
      id: string;
      videoData: VideoData;
    };
  };
};

export const getGenericBlurFrames = <Response>(
  useCase: UseCase<Request, Response>,
  index: number
) => {
  return async (event: Event): Promise<Response> => {
    const { videoData } = event.Input.Payload;

    const request: Request = {
      index,
      videoData,
    };

    const result = await useCase.execute(request);

    if (result.isFailure) {
      throw Error(result.error);
    }

    return result.value;
  };
};
