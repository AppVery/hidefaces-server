import { VideoData } from "../../domain/interfaces/types";
import { generalFileService } from "../../services";
import { Position } from "../../domain/interfaces/imageService";
import { SharpImageService } from "../../services/SharpImageService";
import { Pixel } from "../../services/operations/PixelPO";
import getFilePaths from "../../utils/getFilePaths";

const bucketName = process.env.MAIN_BUCKET_NAME;

const imageService = new SharpImageService();

type Event = {
  Input: {
    Payload: {
      id: string;
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

    if (!frameFacesPositions || frameFacesPositions.length === 0) {
      continue;
    }

    const frameS3key = getFilePaths.s3TmpFrame(videoData.id, i);
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
