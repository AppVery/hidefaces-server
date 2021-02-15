import { Result } from "../../domain/Result";
import { Position } from "../../domain/interfaces/imageService";
import { PositionsOperations } from "./PositionsOperations";
import { ImageService } from "../../domain/interfaces/imageService";

export class Blur extends PositionsOperations {
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

    //Circular border mask to improve blur effect without square default border base on position
    const borderSVG = `<svg><rect x="0" y="0" width="${position.width}" height="${position.height}" rx="100" ry="100"/></svg>`;

    //Depends on size of the image we need more or less blur parameter to get similar result of blur effect: random number after several tests
    const dynamicBlur = Math.ceil(10 + position.width * 0.02);

    const resultBlur = await this.service.makeBlurBorder(
      resultExtract.value,
      borderSVG,
      dynamicBlur
    );

    if (resultBlur.isFailure) {
      return Result.continueFail(resultBlur);
    }

    return Result.ok<Buffer>(resultBlur.value);
  }
}
