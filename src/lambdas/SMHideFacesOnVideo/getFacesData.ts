import getFacesData from "../../useCases/getFacesData";
import { getGenericHandler } from "../genericHandler";
import { VideoData } from "../../domain/interfaces/types";

type Response = {
  id: string;
  videoData: VideoData;
  framesData: string;
};

export const handler = getGenericHandler<Response>(getFacesData);
