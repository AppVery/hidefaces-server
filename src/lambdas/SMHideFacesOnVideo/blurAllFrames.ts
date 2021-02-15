import { VideoData } from "../../domain/interfaces/types";
import { generalFileService } from "../../services";
import { Position } from "../../domain/interfaces/imageService";
import { SharpImageService } from "../../services/SharpImageService";
import { ImageRekognitionService } from "../../services/ImageRekognitionService";
import {
  RekognitionClient,
  FaceDetail,
  BoundingBox,
} from "@aws-sdk/client-rekognition";
import { Result } from "../../domain/Result";
import { Blur } from "../../services/operations/BlurPO";

const bucketName = process.env.MAIN_BUCKET_NAME;

const awsRekognition = new RekognitionClient({});

const imageRekognitionService = new ImageRekognitionService(awsRekognition);

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

  for (let i = 1; i <= videoData.totalFrames; i = i + videoData.fps) {
    const s3key = getFrameS3Key(videoData.id, i);
    const result = await imageRekognitionService.getDataFacesImageS3(
      s3key,
      bucketName
    );
    if (result.isSuccess) {
      facesData.set(i, result.value);
    }
  }
  return facesData;
};

const getFacesPositions = (
  frameWidth: number,
  frameHeight: number,
  BoundingBox: BoundingBox
): Position => {
  const INC_FACES_BOX = 1.8;
  const { Top, Left, Width, Height } = BoundingBox;
  return {
    top: Math.floor(
      Top * frameHeight +
        (Height * frameHeight) / 2 -
        (Height * frameHeight * INC_FACES_BOX) / 2
    ),
    left: Math.floor(
      Left * frameWidth +
        (Width * frameWidth) / 2 -
        (Width * frameWidth * INC_FACES_BOX) / 2
    ),
    width: Math.floor(Width * frameWidth * INC_FACES_BOX),
    height: Math.floor(Height * frameHeight * INC_FACES_BOX),
  };
};

export const handler = async (event: Event): Promise<VideoData> => {
  const operation = new Blur(imageService);
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

    const frameS3key = getFrameS3Key(videoData.id, i);
    const resultFrameBuffer = await generalFileService.getS3Buffer(
      bucketName,
      frameS3key
    );
    const frameFacesPositions = frameData.map(({ BoundingBox }) => {
      return getFacesPositions(videoData.width, videoData.height, BoundingBox);
    });
    const resultOperation = await operation.doTransformation(
      resultFrameBuffer.value,
      frameFacesPositions
    );
    await generalFileService.saveBuffer(
      bucketName,
      frameS3key,
      resultOperation.value
    );
  }

  return videoData;
};
