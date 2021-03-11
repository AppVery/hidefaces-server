import { VideoData } from "../domain/interfaces/types";
import { Position } from "../domain/interfaces/imageService";
import { Request } from "../useCases/blurAllFrames/requestResponseDTO";
import { UseCase } from "../domain/useCase";

type Event = {
  Input: {
    Payload: {
      id: string;
      videoData: VideoData;
      facesPositionsJSON: string;
    };
  };
};

export const getGenericBlurFrames = <Response>(
  useCase: UseCase<Request, Response>,
  index: number
) => {
  return async (event: Event): Promise<Response> => {
    const { videoData, facesPositionsJSON } = event.Input.Payload;

    const data = JSON.parse(facesPositionsJSON);

    const facesPositionsMap: Map<number, Position[]> = new Map(data);

    const request: Request = {
      index,
      videoData,
      facesPositions: facesPositionsMap,
    };

    const result = await useCase.execute(request);

    if (result.isFailure) {
      throw Error(result.error);
    }

    return result.value;
  };
};
