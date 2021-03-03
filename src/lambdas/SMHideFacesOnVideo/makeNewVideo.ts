import makeNewVideo from "../../useCases/makeNewVideo";
import { getGenericHandler } from "../genericHandler";

export const handler = getGenericHandler(makeNewVideo);
