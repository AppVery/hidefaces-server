import { Result } from './Result';

export interface UseCase<UseCaseRequest, UseCaseResponse> {
  execute(request?: UseCaseRequest): Promise<Result<UseCaseResponse>> | Result<UseCaseResponse>;
}
