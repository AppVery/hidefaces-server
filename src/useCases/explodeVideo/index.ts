import { ExplodeVideo } from "./ExplodeVideo";
import { generalFileService } from "../../services";
import { FfmpegVideoService } from "../../services/FfmpegVideoService";
import * as chokidar from "chokidar";

export type Chokidar = typeof chokidar;

export default new ExplodeVideo(
  generalFileService,
  new FfmpegVideoService(),
  chokidar
);
