import { VideoData } from "../domain/interfaces/types";
import { Position } from "../domain/interfaces/imageService";
import { Request } from "../useCases/blurAllFrames/requestResponseDTO";
import { UseCase } from "../domain/useCase";

type Event = {
  Input: {
    Payload: {
      id: string;
      videoData: VideoData;
      framesData: string;
    };
  };
};

export const getGenericBlurFrames = <Response>(
  useCase: UseCase<Request, Response>,
  index: number
) => {
  return async (event: Event): Promise<Response> => {
    const { videoData, framesData } = event.Input.Payload;

    const data = JSON.parse(framesData);
    const mapper: Map<number, number> = new Map(data.mapper);
    const facesPositions: Map<number, Position[]> = new Map(
      data.facesPositions
    );

    const request: Request = {
      index,
      videoData,
      framesData: {
        mapper,
        facesPositions,
      },
    };

    const result = await useCase.execute(request);

    if (result.isFailure) {
      throw Error(result.error);
    }

    return result.value;
  };
};
