import explodeVideo from "../../useCases/explodeVideo";
import { getGenericHandler } from "../genericHandler";
import { VideoData } from "../../domain/interfaces/types";

type Response = VideoData;

export const handler = getGenericHandler<Response>(explodeVideo);
