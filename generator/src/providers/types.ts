/** AI プロバイダ抽象。system プロンプトと user プロンプトを渡し、応答テキストを返す */
export interface AIProvider {
  complete(system: string, user: string): Promise<string>;
}
