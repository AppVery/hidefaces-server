import { VideoData } from "../../domain/interfaces/types";
import { generalFileService } from "../../services";
import { Position } from "../../domain/interfaces/imageService";
import { SharpImageService } from "../../services/SharpImageService";
import { AwsRekognitionService } from "../../services/AwsRekognitionService";
import {
  RekognitionClient,
  FaceDetail,
  BoundingBox,
} from "@aws-sdk/client-rekognition";
import { Pixel } from "../../services/operations/PixelPO";

const bucketName = process.env.MAIN_BUCKET_NAME;

const awsRekognition = new RekognitionClient({});

const awsRekognitionService = new AwsRekognitionService(awsRekognition);

const imageService = new SharpImageService();

type Event = {
  Input: {
    Payload: VideoData;
  };
};

const getFrameS3Key = (id: string, i: number): string => {
  return `videos/temporal/${id}/frame-${i}.png`;
};

const getFacesData = async (
  videoData: VideoData
): Promise<Map<number, FaceDetail[]>> => {
  const baseS3key = `videos/temporal/${videoData.id}`;
  const facesData = new Map<number, FaceDetail[]>();

  for (let i = 1; i <= videoData.totalFrames; i += videoData.fps) {
    const s3key = getFrameS3Key(videoData.id, i);
    const result = await awsRekognitionService.getDataFacesImageS3(
      s3key,
      bucketName
    );

    if (result.isSuccess) {
      const beforeFrameData = facesData.has(i - videoData.fps)
        ? facesData.get(i - videoData.fps)
        : [];
      if (result.value.length > 0 && beforeFrameData.length === 0) {
        facesData.set(i - videoData.fps, result.value);
      }
      if (result.value.length === 0 && beforeFrameData.length > 0) {
        facesData.set(i, beforeFrameData);
      } else {
        facesData.set(i, result.value);
      }
    }
  }

  return facesData;
};

const getFacesPositions = (
  frameWidth: number,
  frameHeight: number,
  BoundingBox: BoundingBox
): Position => {
  const INC_FACES_BOX = 2.2;
  const { Top, Left, Width, Height } = BoundingBox;
  const top = Math.floor(
    Top * frameHeight +
      (Height * frameHeight) / 2 -
      (Height * frameHeight * INC_FACES_BOX) / 2
  );
  const left = Math.floor(
    Left * frameWidth +
      (Width * frameWidth) / 2 -
      (Width * frameWidth * INC_FACES_BOX) / 2
  );
  return {
    top: top > 0 ? top : 0,
    left: left > 0 ? left : 0,
    width: Math.floor(Width * frameWidth * INC_FACES_BOX),
    height: Math.floor(Height * frameHeight * INC_FACES_BOX),
  };
};

export const handler = async (event: Event): Promise<VideoData> => {
  const operation = new Pixel(imageService);
  const videoData = event.Input.Payload;
  const facesData = await getFacesData(videoData);

  let frameWithData = 1;
  for (let i = 1; i <= videoData.totalFrames; i++) {
    frameWithData =
      i === frameWithData || i < frameWithData + videoData.fps / 2
        ? frameWithData
        : frameWithData + videoData.fps;

    const frameData = facesData.has(frameWithData)
      ? facesData.get(frameWithData)
      : facesData.get(frameWithData - videoData.fps);

    const frameFacesPositions = frameData.map(({ BoundingBox }) => {
      return getFacesPositions(videoData.width, videoData.height, BoundingBox);
    });

    if (frameFacesPositions.length === 0) {
      /* eslint-disable no-console */
      console.log("empty faces data");
      continue;
    }

    const frameS3key = getFrameS3Key(videoData.id, i);
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
