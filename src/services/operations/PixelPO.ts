import { Result } from "../../domain/Result";
import { Position } from "../../domain/interfaces/imageService";
import { PositionsOperations } from "./PositionsOperations";
import { ImageService } from "../../domain/interfaces/imageService";

export class Pixel extends PositionsOperations {
  constructor(service: ImageService) {
    super(service);
  }

  protected async transformation(
    originalImageBuffer: Buffer,
    position: Position
  ): Promise<Result<Buffer>> {
    const resultExtract = await this.service.getExtract(
      originalImageBuffer,
      position
    );

    if (resultExtract.isFailure) {
      return Result.continueFail(resultExtract);
    }

    const resultPixelation = await this.service.makePixelation(
      resultExtract.value,
      position.width,
      15
    );

    if (resultPixelation.isFailure) {
      return Result.continueFail(resultPixelation);
    }

    return Result.ok<Buffer>(resultPixelation.value);
  }
}
