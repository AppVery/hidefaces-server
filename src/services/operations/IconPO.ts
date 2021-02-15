import { Result } from "../../domain/Result";
import { Position } from "../../domain/interfaces/imageService";
import { PositionsOperations } from "./PositionsOperations";
import { ImageService } from "../../domain/interfaces/imageService";

export class Icon extends PositionsOperations {
  private icons: Buffer[];

  constructor(service: ImageService, icons: Buffer[]) {
    super(service);
    this.icons = icons;
  }

  protected async transformation(
    originalImageBuffer: Buffer,
    position: Position,
    index: number
  ): Promise<Result<Buffer>> {
    const icon = this.icons[index] ?? this.icons[0];
    const resultIcon = await this.service.getIcon(
      icon,
      position.width,
      position.height
    );

    if (resultIcon.isFailure) {
      return Result.continueFail(resultIcon);
    }

    return Result.ok<Buffer>(resultIcon.value);
  }
}
