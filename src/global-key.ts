export default class GlobalKey {
  private static instance: GlobalKey;
  private key: string;

  private constructor() {
    this.key = '';
  }

  public static getInstance(): GlobalKey {
    // Create a singleton instance of KeyManager
    if (!GlobalKey.instance) {
      GlobalKey.instance = new GlobalKey();
    }
    return GlobalKey.instance;
  }

  public setKey(key: string): void {
    // Set the global key
    this.key = key;
  }

  public hasKey(): boolean {
    // Check if the global key is set
    return this.key !== '';
  }

  public getKey(): string {
    // Get the global key
    return this.key;
  }
}
