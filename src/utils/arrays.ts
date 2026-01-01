export function swapArrayElements<T>(
  arr: T[],
  fromIndex: number,
  toIndex: number
): void {
  if (toIndex < 0 || toIndex >= arr.length) return;

  const temp = arr[fromIndex];
  arr[fromIndex] = arr[toIndex];
  arr[toIndex] = temp;
}
