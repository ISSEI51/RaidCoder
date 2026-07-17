// シンプルなタイムスタンプ付きロガー
export function log(message: string): void {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

export function warn(message: string): void {
  console.warn(`[${new Date().toISOString()}] ⚠️  ${message}`);
}
