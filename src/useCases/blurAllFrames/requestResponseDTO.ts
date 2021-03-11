import { VideoData } from "../../domain/interfaces/types";
import { Position } from "../../domain/interfaces/imageService";

export type Request = {
  index: number;
  videoData: VideoData;
  facesPositions: Map<number, Position[]>;
};

export type Response = VideoData;
