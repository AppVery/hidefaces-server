import { CheckVideoSource } from "./CheckVideoSource";
import { generalFileService } from "../../services";
import { FfmpegVideoService } from "../../services/FfmpegVideoService";

export default new CheckVideoSource(
  generalFileService,
  new FfmpegVideoService()
);
