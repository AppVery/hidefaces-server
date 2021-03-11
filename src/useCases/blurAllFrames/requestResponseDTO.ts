import { VideoData } from "../../domain/interfaces/types";

export type Request = {
  index: number;
  videoData: VideoData;
};

export type Response = VideoData;
