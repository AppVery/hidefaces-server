import explodeVideo from "../../useCases/explodeVideo";
import { getGenericHandler } from "../genericHandler";

export const handler = getGenericHandler(explodeVideo);
