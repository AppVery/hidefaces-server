import { VideoData } from "../../domain/interfaces/types";
import { generalFileService } from "../../services";
import { Position } from "../../domain/interfaces/imageService";
import { SharpImageService } from "../../services/SharpImageService";
import { Pixel } from "../../services/operations/PixelPO";

const bucketName = process.env.MAIN_BUCKET_NAME;

const imageService = new SharpImageService();

type Event = {
  Input: {
    Payload: {
      videoData: VideoData;
      framesData: string;
    };
  };
};

export const handler = async (event: Event): Promise<VideoData> => {
  const operation = new Pixel(imageService);
  const { videoData, framesData } = event.Input.Payload;
  const data = JSON.parse(framesData);

  const mapper: Map<number, number> = new Map(data.mapper);
  const facesPositions: Map<number, Position[]> = new Map(data.facesPositions);

  for (let i = 1; i <= videoData.totalFrames; i++) {
    const frameWithData = mapper.get(i);
    const frameFacesPositions = facesPositions.get(frameWithData);

    if (frameFacesPositions.length === 0) {
      /* eslint-disable no-console */
      console.log("empty faces data on frame", i);
      continue;
    }

    const frameS3key = `videos/temporal/${videoData.id}/frame-${i}.png`;
    const resultFrameBuffer = await generalFileService.getS3Buffer(
      bucketName,
      frameS3key
    );

    if (resultFrameBuffer.isSuccess) {
      const resultOperation = await operation.doTransformation(
        resultFrameBuffer.value,
        frameFacesPositions
      );

      if (resultOperation.isSuccess) {
        await generalFileService.saveBuffer(
          bucketName,
          frameS3key,
          resultOperation.value
        );
      }
    }
  }

  return videoData;
};
