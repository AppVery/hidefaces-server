import blurAllFrames from "../../useCases/blurAllFrames";
import { getGenericBlurFrames } from "../genericBlurFrames";
import { VideoData } from "../../domain/interfaces/types";

type Response = VideoData;

export const handler = getGenericBlurFrames<Response>(blurAllFrames, 1);
