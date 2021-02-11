import { VideoData } from "../../domain/interfaces/types";

type Event = {
  Input: {
    Payload: VideoData;
  };
};

export const handler = async (event: Event): Promise<VideoData> => {
  const videoData = event.Input.Payload;

  return videoData;
};
