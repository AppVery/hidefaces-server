import { notifySuccess } from "../../useCases/notify";
import { Request } from "../../useCases/notify/requestResponseDTO";
import { VideoData } from "../../domain/interfaces/types";

type Event = {
  Input: {
    Payload: VideoData;
  };
};

export const handler = async (event: Event): Promise<void> => {
  const { id } = event.Input.Payload;

  const request: Request = {
    id,
  };

  const result = await notifySuccess.execute(request);

  if (result.isFailure) {
    throw Error(result.error);
  }
};
