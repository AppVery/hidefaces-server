import { notifyError } from "../../useCases/notify";
import { Request } from "../../useCases/notify/requestResponseDTO";

type Event = {
  Input: {
    id: string;
    error: {
      Cause: string;
    };
  };
};

export const handler = async (event: Event): Promise<void> => {
  const {
    id,
    error: { Cause },
  } = event.Input;

  const request: Request = {
    id,
    error: Cause,
  };

  const result = await notifyError.execute(request);

  if (result.isFailure) {
    throw Error(result.error);
  }
};
