import { VideoData } from "../../domain/interfaces/types";

export type Request = {
  id: string;
  extension: string;
};

export type Response = VideoData;
