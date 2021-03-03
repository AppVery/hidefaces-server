import { VideoData } from "../../domain/interfaces/types";

export type Request = {
  id: string;
  filename: string;
  s3key: string;
};

export type Response = VideoData;
