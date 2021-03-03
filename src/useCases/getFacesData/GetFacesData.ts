import { Request, Response } from "./requestResponseDTO";
import { Position } from "../../domain/interfaces/imageService";
import { RekognitionService } from "../../domain/interfaces/rekognitionService";
import { VideoData } from "../../domain/interfaces/types";
import { Result } from "../../domain/Result";
import { UseCase } from "../../domain/useCase";
import getFilePaths from "../../utils/getFilePaths";
import { FaceDetail, BoundingBox } from "@aws-sdk/client-rekognition";

export class GetFacesData implements UseCase<Request, Response> {
  private bucketName = process.env.MAIN_BUCKET_NAME;
  private iaService: RekognitionService;
  private INTERVAL = 5;

  constructor(iaService: RekognitionService) {
    this.iaService = iaService;
  }

  public async execute(request: Request): Promise<Result<Response>> {
    const { videoData } = request;
    const { width, height, totalFrames } = videoData;

    const maxVector = this.getPitagorasVector(width, height);
    let lastFrameWithData = 1;

    const facesData: Map<number, FaceDetail[]> = new Map();

    for (let i = 1; i <= totalFrames; i += this.INTERVAL) {
      const s3key = getFilePaths.s3TmpFrame(videoData.id, i);
      const result = await this.iaService.getDataFacesImageS3(
        s3key,
        this.bucketName
      );

      if (result.isSuccess) {
        const beforeFrameData = facesData.has(i - this.INTERVAL)
          ? facesData.get(i - this.INTERVAL)
          : [];
        if (result.value.length > 0 && i > 1 && beforeFrameData.length === 0) {
          facesData.set(i - this.INTERVAL, result.value);
        }
        if (result.value.length === 0 && beforeFrameData.length > 0) {
          facesData.set(i, beforeFrameData);
        } else {
          facesData.set(i, result.value);
        }
      }

      lastFrameWithData = i;
    }

    const facesPositions = new Map<number, Position[]>();

    for (const [key, frameData] of facesData) {
      if (frameData && frameData.length > 0) {
        const frameFacesPositions = frameData.map(({ BoundingBox }) => {
          return this.getFacesPositions(videoData, BoundingBox);
        });
        facesPositions.set(key, frameFacesPositions);
      }
    }

    //improve frames data by sharing data between frames
    for (const [key, frameData] of facesPositions) {
      //if we are not in the first or last frame
      if (key > 1 && key < lastFrameWithData) {
        const beforeData = facesPositions.get(key - this.INTERVAL) || [];
        const afterData = facesPositions.get(key + this.INTERVAL) || [];
        let currentData = frameData || [];

        //if current frame have less faces than later
        if (currentData.length < afterData.length) {
          /* eslint-disable  no-console */
          console.log("improve current frame", key);
          currentData = [...currentData, ...afterData];
          facesPositions.set(key, currentData);
        }

        //improve before frame in case of less faces or detect quick movement
        if (
          currentData.length > beforeData.length ||
          this.isQuickMovement(beforeData, currentData, maxVector)
        ) {
          /* eslint-disable  no-console */
          console.log("improve before frame", key);
          facesPositions.set(key - this.INTERVAL, [
            ...beforeData,
            ...currentData,
          ]);
        }
      }
    }

    const mapper = new Map<number, number>();
    let frameWithData = 1;

    for (let i = 1; i <= videoData.totalFrames; i++) {
      if (i >= frameWithData + this.INTERVAL / 2) {
        frameWithData = frameWithData + this.INTERVAL;
      }

      const frameToMap = facesPositions.has(frameWithData)
        ? frameWithData
        : frameWithData - this.INTERVAL;

      mapper.set(i, frameToMap);
    }

    const framesData: string = JSON.stringify({
      facesPositions: [...facesPositions],
      mapper: [...mapper],
    });

    const response: Response = { id: videoData.id, videoData, framesData };

    return Result.ok<Response>(response);
  }

  private getFacesPositions(
    videoData: VideoData,
    BoundingBox: BoundingBox
  ): Position {
    const frameWidth = videoData.width;
    const frameHeight = videoData.height;
    const maxWidth = videoData.width;
    const maxHeight = videoData.height;
    const INC_FACES_BOX = 1.8;
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
    const positions = {
      top: Math.min(Math.abs(top), maxHeight),
      left: Math.min(Math.abs(left), maxWidth),
      width: Math.floor(Width * frameWidth * INC_FACES_BOX),
      height: Math.floor(Height * frameHeight * INC_FACES_BOX),
    };

    //avoid set wrong data outside max dimensions of frames
    return {
      top: positions.top,
      left: positions.left,
      width:
        positions.left + positions.width >= maxWidth
          ? maxWidth - positions.left
          : positions.width,
      height:
        positions.top + positions.height >= maxHeight
          ? maxHeight - positions.top
          : positions.height,
    };
  }

  private isQuickMovement(
    beforeData: Position[],
    currentData: Position[],
    maxVector: number
  ): boolean {
    const getMinMaxVectorsPercentage = (
      positions: Position[],
      maxVector: number
    ): { min: number; max: number } => {
      const getVector = (position: Position): number => {
        const { top, left, width, height } = position;
        return this.getPitagorasVector(left + width / 2, top + height / 2);
      };
      const vectors = positions.map((position) => getVector(position));
      return {
        min: Math.round((Math.max(...vectors) * 100) / maxVector),
        max: Math.round((Math.min(...vectors) * 100) / maxVector),
      };
    };
    const { min: beforeMin, max: beforeMax } = getMinMaxVectorsPercentage(
      beforeData,
      maxVector
    );
    const { min: currentMin, max: currentMax } = getMinMaxVectorsPercentage(
      currentData,
      maxVector
    );

    //check if quick movement >10% is detect
    const check =
      Math.abs(currentMin - beforeMin) > 10 ||
      Math.abs(currentMax - beforeMax) > 10;

    if (check) {
      /* eslint-disable  no-console */
      console.log("quick movement", beforeData, currentData);
    }

    return check;
  }

  private getPitagorasVector(x: number, y: number): number {
    return Math.round(Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));
  }
}
