export class Result<T> {
  public isSuccess: boolean;
  public isFailure: boolean;
  public code: number;
  public error: string;
  private _value: T | undefined;

  private constructor(isSuccess: boolean, code: number, error: string, value?: T) {
    if (isSuccess && error) {
      throw new Error('InvalidOperation: A result cannot be successful and contain an error');
    }
    if (!isSuccess && !error) {
      throw new Error('InvalidOperation: A failing result needs to contain an error message');
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.code = code;
    this.error = error;
    this._value = value;

    Object.freeze(this);
  }

  get value(): T {
    if (this.isFailure) {
      throw new Error("Can't get the value of an error result. Use 'error' & 'code' instead.");
    }

    return this._value as T;
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, 200, '', value);
  }

  public static fail<U>(error = 'fail result', code = 400): Result<U> {
    return new Result<U>(false, code, error);
  }

  public static combine(results: Result<unknown>[]): Result<unknown> {
    for (const result of results) {
      if (result.isFailure) return result;
    }
    return Result.ok(results);
  }
}
