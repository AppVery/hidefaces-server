import { VideoData } from "../../domain/interfaces/types";
import { Position } from "../../domain/interfaces/imageService";

export type Request = {
  index: number;
  videoData: VideoData;
  framesData: {
    mapper: Map<number, number>;
    facesPositions: Map<number, Position[]>;
  };
};

export type Response = VideoData;
