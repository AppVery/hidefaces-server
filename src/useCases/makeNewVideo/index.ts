import { MakeNewVideo } from "./MakeNewVideo";
import { generalFileService } from "../../services";
import { FfmpegVideoService } from "../../services/FfmpegVideoService";

export default new MakeNewVideo(generalFileService, new FfmpegVideoService());
