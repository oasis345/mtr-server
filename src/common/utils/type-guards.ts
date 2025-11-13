/**
 * 주어진 값이 함수인지 확인하는 타입 가드 함수입니다.
 * @param value 확인할 값
 * @returns 값이 함수이면 true, 아니면 false를 반환합니다.
 */
export function isFunction(value: any): value is (...args: any[]) => any {
  return typeof value === 'function';
}
