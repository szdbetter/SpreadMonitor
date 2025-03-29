declare module 'lodash' {
  export function get<TObject extends object, TKey extends keyof TObject>(
    object: TObject,
    path: TKey | [TKey]
  ): TObject[TKey];
  export function get<TObject extends object, TKey extends keyof TObject>(
    object: TObject | null | undefined,
    path: TKey | [TKey]
  ): TObject[TKey] | undefined;
  export function get<TObject extends object, TKey extends keyof TObject, TDefault>(
    object: TObject | null | undefined,
    path: TKey | [TKey],
    defaultValue: TDefault
  ): TObject[TKey] | TDefault;
  export function get<T>(
    object: any,
    path: string | number | Array<string | number>,
    defaultValue?: T
  ): T;

  // 添加更多你需要的 lodash 函数...

  const _: {
    get: typeof get;
    // 添加更多你需要的 lodash 函数...
  };

  export default _;
} 