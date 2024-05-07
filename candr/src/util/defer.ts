/**
 * Create a deferred callback that is externally resolved or rejected. A
 * transform function can be provided to modify the resolved value. The
 * transform function is only called once the first time the callback is
 * invoked, and the result is cached to be returned by subsequent invocations.
 */
export const defer = <TInput = undefined, TOutput = TInput>(transform?: (value: TInput) => Promise<TOutput>): [
  callback: () => Promise<TOutput>,
  resolve: (...args: undefined extends TInput
    ? [value?: TInput | PromiseLike<TInput>]
    : [value: TInput | PromiseLike<TInput>]) => void,
  reject: (reason: unknown) => void,
] => {
  let resolve_: (value: TInput | PromiseLike<TInput>) => void;
  let reject_: (reason: unknown) => void;
  let result: { value: TOutput | PromiseLike<TOutput> } | undefined;

  const promise = new Promise<TInput>((resolve, reject) => {
    resolve_ = resolve;
    reject_ = reject;
  });

  const callback = (): Promise<TOutput> => promise.then((value) => {
    if (!result) {
      result = {
        value: transform
          ? transform(value)
          : value as unknown as TOutput,
      };
    }

    return result.value;
  });

  const resolve = (value?: TInput | PromiseLike<TInput>): void => {
    resolve_(value as TInput | PromiseLike<TInput>);
  };

  const reject = (reason: unknown): void => {
    reject_(reason);
  };

  return [callback, resolve, reject];
};
