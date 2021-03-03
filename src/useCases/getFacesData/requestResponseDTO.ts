import { VideoData } from "../../domain/interfaces/types";

export type Request = {
  videoData: VideoData;
};

export type Response = {
  id: string;
  videoData: VideoData;
  framesData: string;
};
