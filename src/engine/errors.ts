/** Thrown when an action is illegal in the current state. The state is left unchanged. */
export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineError";
  }
}
