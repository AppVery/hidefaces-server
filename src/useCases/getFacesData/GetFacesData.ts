import { Request, Response } from "./requestResponseDTO";
import { Position } from "../../domain/interfaces/imageService";
import { RekognitionService } from "../../domain/interfaces/rekognitionService";
import { VideoData } from "../../domain/interfaces/types";
import { Result } from "../../domain/Result";
import { UseCase } from "../../domain/useCase";
import getFilePaths from "../../utils/getFilePaths";
import { FaceDetail, BoundingBox } from "@aws-sdk/client-rekognition";
import config from "../../domain/config";

export class GetFacesData implements UseCase<Request, Response> {
  private bucketName = process.env.MAIN_BUCKET_NAME;
  private iaService: RekognitionService;
  private INTERVAL = config.INTERVAL;

  constructor(iaService: RekognitionService) {
    this.iaService = iaService;
  }

  public async execute(request: Request): Promise<Result<Response>> {
    const { videoData } = request;

    const { lastFrameWithData, facesData } = await this.analyzeFacesData(
      videoData
    );

    const facesPositions = this.analyzeFacesPositions(
      videoData,
      lastFrameWithData,
      facesData
    );

    const facesPositionsJSON: string = JSON.stringify([...facesPositions]);

    const response: Response = {
      id: videoData.id,
      videoData,
      facesPositionsJSON,
    };

    return Result.ok<Response>(response);
  }

  private async analyzeFacesData(
    videoData: VideoData
  ): Promise<{
    lastFrameWithData: number;
    facesData: Map<number, FaceDetail[]>;
  }> {
    const { id, totalFrames } = videoData;
    let lastFrameWithData = 1;

    const facesData: Map<number, FaceDetail[]> = new Map();

    for (let i = 1; i <= totalFrames; i += this.INTERVAL) {
      const s3key = getFilePaths.s3TmpFrame(id, i);
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

    return {
      lastFrameWithData,
      facesData,
    };
  }

  private analyzeFacesPositions(
    videoData: VideoData,
    lastFrameWithData: number,
    facesData: Map<number, FaceDetail[]>
  ): Map<number, Position[]> {
    const { width, height } = videoData;
    const maxVector = this.getPitagorasVector(width, height);
    const facesPositions = new Map<number, Position[]>();

    for (const [key, frameData] of facesData) {
      if (frameData && frameData.length > 0) {
        const frameFacesPositions = frameData.map(({ BoundingBox }) => {
          return this.getFacesPositions(videoData, BoundingBox);
        });
        facesPositions.set(key, frameFacesPositions);
      }
    }

    const betterFacesPositions = this.improveFramesData(
      maxVector,
      lastFrameWithData,
      facesPositions
    );

    return betterFacesPositions;
  }

  private improveFramesData(
    maxVector: number,
    lastFrameWithData: number,
    facesPositions: Map<number, Position[]>
  ): Map<number, Position[]> {
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

    return facesPositions;
  }

  private getFacesPositions(
    videoData: VideoData,
    BoundingBox: BoundingBox
  ): Position {
    const INC_FACES_BOX = config.INC_FACES_BOX;
    const frameWidth = videoData.width;
    const frameHeight = videoData.height;
    const { Top, Left, Width, Height } = BoundingBox; //percentages of total sizes
    const topPosition = Math.floor(
      Top * frameHeight +
        (Height * frameHeight) / 2 -
        (Height * frameHeight * INC_FACES_BOX) / 2
    );
    const leftPosition = Math.floor(
      Left * frameWidth +
        (Width * frameWidth) / 2 -
        (Width * frameWidth * INC_FACES_BOX) / 2
    );
    const positions = {
      //avoid negative values with min. of 5px vs avoid go to the limits of the frame
      top: Math.min(topPosition <= 0 ? 5 : topPosition, frameHeight - 10),
      left: Math.min(leftPosition <= 0 ? 5 : leftPosition, frameWidth - 10),
      width: Math.floor(Width * frameWidth * INC_FACES_BOX),
      height: Math.floor(Height * frameHeight * INC_FACES_BOX),
    };

    //avoid set wrong data outside max dimensions of frames
    return {
      top: positions.top,
      left: positions.left,
      width:
        positions.left + positions.width >= frameWidth
          ? frameWidth - positions.left - 5 //avoid border in 5px
          : positions.width,
      height:
        positions.top + positions.height >= frameHeight
          ? frameHeight - positions.top - 5 //avoid border in 5px
          : positions.height,
    };
  }

  private isQuickMovement(
    beforeData: Position[],
    currentData: Position[],
    maxVector: number
  ): boolean {
    const { min: beforeMin, max: beforeMax } = this.getMinMaxVectorsPercentage(
      beforeData,
      maxVector
    );
    const {
      min: currentMin,
      max: currentMax,
    } = this.getMinMaxVectorsPercentage(currentData, maxVector);

    //check if quick movement >10% is detect
    const check =
      Math.abs(currentMin - beforeMin) > config.QUICK_MOVEMENT ||
      Math.abs(currentMax - beforeMax) > config.QUICK_MOVEMENT;

    if (check) {
      /* eslint-disable  no-console */
      console.log("quick movement", beforeData, currentData);
    }

    return check;
  }

  private getMinMaxVectorsPercentage(
    positions: Position[],
    maxVector: number
  ): { min: number; max: number } {
    const vectors = positions.map((position) => this.getVector(position));

    return {
      min: Math.round((Math.max(...vectors) * 100) / maxVector),
      max: Math.round((Math.min(...vectors) * 100) / maxVector),
    };
  }

  private getVector(position: Position): number {
    const { top, left, width, height } = position;
    return this.getPitagorasVector(left + width / 2, top + height / 2);
  }

  private getPitagorasVector(x: number, y: number): number {
    return Math.round(Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));
  }
}
