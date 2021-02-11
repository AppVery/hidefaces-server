import { generalFileService } from "../../services";
import { VideoData } from "../../domain/interfaces/types";

/* eslint-disable @typescript-eslint/no-var-requires */
const ffmpeg = require("fluent-ffmpeg");
const bucketName = process.env.MAIN_BUCKET_NAME;

type Event = {
  Input: {
    s3key: string;
  };
};

export const handler = async (event: Event): Promise<VideoData> => {
  const { s3key } = event.Input;
  const [, , id, filename] = s3key.split("/");

  const resultVideo = await generalFileService.getS3Stream(bucketName, s3key);

  if (resultVideo.isFailure) {
    throw Error(`getVideoMetadata: ${resultVideo.error}`);
  }

  const getMetadata = async () => {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(resultVideo.value, function (error: any, metadata: any) {
        if (error) {
          throw Error(`getVideoMetadata: ${error}`);
        }
        resolve(metadata);
      });
    });
  };

  const metadata: any = await getMetadata();
  const video = metadata.streams[0];

  return {
    id,
    filename,
    duration: video.duration,
    width: video.width,
    height: video.height,
    totalFrames: video.nb_frames,
    fps: parseInt(video.r_frame_rate.split("/")[0]),
  };
};
